// Server entrypoints ONLY: Cloudflare Pages Function and local preview server.
// No Node APIs, cookies, service_role key or SQL. All upstream requests are read-only HTTPS.
import { FACILITY_SOURCE, RESTROOM_STATIONS, type FacilityData, type FacilityResponse, type Restroom } from "../lib/facilities";

export type FacilityEnv = {
  SUBWAY_FACILITY_API_KEY?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
};
type Result = { body: FacilityResponse; http: number };
export type FacilityDiagnostic = {
  event: "facility_lookup_failed";
  stage: "db_fetch" | "db_json" | "api_fetch" | "api_json";
  code: string;
  upstreamStatus?: number;
  apiCode?: string;
  failureKind?: "timeout" | "invalid_json" | "type_error" | "network";
};
const TTL = 10 * 60_000;
const ERROR_TTL = 30_000;
const err = (code: string, message: string, http = 502): Result => ({ body: { status: "error", code, message }, http });
function response(result: Result) {
  return Response.json(result.body, { status: result.http, headers: {
    "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer",
  } });
}
function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function createFacilityHandler(options: { fetcher?: typeof fetch; now?: () => number; onDiagnostic?: (diagnostic: FacilityDiagnostic) => void } = {}) {
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? Date.now;
  const onDiagnostic = options.onDiagnostic ?? (diagnostic => console.warn(JSON.stringify(diagnostic)));
  // Bounded to the 51 audited station codes. No raw response, key or sensitive upstream URL in the cache.
  const cache = new Map<string, { memberId: string; until: number; result: Result }>();
  const pending = new Map<string, { memberId: string; result: Promise<Result> }>();

  return async (request: Request, env: FacilityEnv): Promise<Response> => {
    if (request.method !== "GET") return response(err("method", "조회 요청만 허용됩니다.", 405));
    const params = new URL(request.url).searchParams;
    if ([...params.keys()].some(k => !["lineCode", "stationCode", "membershipId"].includes(k)) ||
        ["lineCode", "stationCode", "membershipId"].some(k => params.getAll(k).length !== 1)) {
      return response(err("validation", "노선과 역 선택을 확인해 주세요.", 400));
    }
    const code = params.get("stationCode")!;
    const memberId = params.get("membershipId")!;
    if (params.get("lineCode") !== "02호선" || !Object.hasOwn(RESTROOM_STATIONS, code)) {
      return response(err("unsupported", "아직 제공되지 않는 역입니다", 404));
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(memberId)) {
      return response(err("validation", "역 식별 정보를 확인해 주세요.", 400));
    }
    let origin: string;
    let key: string;
    try {
      origin = new URL(env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
      if (origin !== "https://gavsuuazjauzjeyjhoao.supabase.co" ||
          !/^sb_publishable_\S+$/.test(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "")) throw new Error();
      key = env.SUBWAY_FACILITY_API_KEY?.trim() ?? "";
      if (/%[0-9a-f]{2}/i.test(key)) key = decodeURIComponent(key);
      if (!key || /\s/.test(key)) throw new Error();
    } catch {
      return response(err("configuration", "편의시설 조회 서버 설정이 준비되지 않았습니다. 관리자에게 문의해 주세요.", 503));
    }
    const hit = cache.get(code);
    if (hit && hit.memberId === memberId && hit.until > now()) return response(hit.result);
    const running = pending.get(code);
    if (running) {
      if (running.memberId !== memberId) return response(err("busy", "다른 조회가 진행 중입니다. 잠시 후 다시 확인해 주세요.", 429));
      return response(await running.result);
    }

    const run = async (): Promise<Result> => {
      let stage: FacilityDiagnostic["stage"] = "db_fetch";
      let upstreamStatus: number | undefined;
      let apiCode: string | undefined;
      const fail = (code: string, message: string, http = 502, failureKind?: FacilityDiagnostic["failureKind"]): Result => {
        // Closed metadata only: never log URLs, Location, headers, bodies, IDs or raw exceptions.
        try { onDiagnostic({ event: "facility_lookup_failed", stage, code, upstreamStatus, apiCode, failureKind }); } catch { /* Logging must not change the response. */ }
        return err(code, message, http);
      };
      try {
        // Resolve the browser's membership UUID against the real public DB, never by name alone.
        const dbUrl = new URL(origin + "/rest/v1/line_stations");
        dbUrl.searchParams.set("select", "id,source_code,source_dataset,stations!inner(name,source_code,source_dataset),lines!inner(name,source_code,source_dataset)");
        dbUrl.searchParams.set("id", `eq.${memberId}`);
        dbUrl.searchParams.set("source_dataset", "eq.seoul_metro_oa15442");
        dbUrl.searchParams.set("source_code", `eq.02호선:${code}`);
        // Workers does not support redirect:"error". Manual mode NEVER follows Location.
        const dbResponse = await fetcher(dbUrl, { headers: { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! }, redirect: "manual", signal: AbortSignal.timeout(12_000) });
        upstreamStatus = dbResponse.status;
        if (dbResponse.status >= 300 && dbResponse.status < 400) return fail("redirect", "DB 조회의 외부 주소 이동을 차단했습니다. 관리자에게 문의해 주세요.");
        if (!dbResponse.ok) return fail("reference", "DB의 노선·역 연결을 확인하지 못했습니다.");
        stage = "db_json";
        const records: unknown = await dbResponse.json();
        if (!Array.isArray(records) || records.length !== 1) return fail("mapping", "선택한 역의 노선 연결이 일치하지 않습니다.", 400);
        const record = object(records[0]), station = object(record.stations), line = object(record.lines);
        if (record.id !== memberId || record.source_dataset !== "seoul_metro_oa15442" || record.source_code !== `02호선:${code}` ||
            station.source_dataset !== "seoul_metro_oa15442" || station.source_code !== record.source_code || station.name !== RESTROOM_STATIONS[code] ||
            line.source_dataset !== "seoul_metro_oa15442" || line.source_code !== "02호선" || line.name !== "2호선") {
          return fail("mapping", "선택한 역의 노선·역 코드가 일치하지 않습니다.", 400);
        }

        const apiUrl = new URL("https://apis.data.go.kr/B553766/facility/getFcRstrm");
        for (const [k, value] of Object.entries({ serviceKey: key, dataType: "JSON", pageNo: "1", numOfRows: "100", lineNm: "2호선", stnCd: code })) apiUrl.searchParams.set(k, value);
        stage = "api_fetch";
        upstreamStatus = undefined;
        const upstream = await fetcher(apiUrl, { redirect: "manual", signal: AbortSignal.timeout(12_000) });
        upstreamStatus = upstream.status;
        if (upstream.status >= 300 && upstream.status < 400) return fail("redirect", "공공데이터 API의 외부 주소 이동을 차단했습니다. 관리자에게 문의해 주세요.");
        if (!upstream.ok) return fail(upstream.status === 401 || upstream.status === 403 ? "auth" : "upstream", "공공데이터 API에서 정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.");
        // Gateway errors may be XML even when JSON was requested. Never echo any raw body/URL.
        stage = "api_json";
        const raw: unknown = await upstream.json();
        const root = object(object(raw).response ?? raw), header = object(root.header), body = object(root.body);
        const returnedCode = String(header.resultCode);
        apiCode = ["00", "0", "03", "3", "20", "22", "23", "30", "31", "32"].includes(returnedCode) ? returnedCode : "other";
        const noData = ["03", "3"].includes(apiCode);
        if (!["00", "0"].includes(apiCode) && !noData) {
          if (["22", "23"].includes(apiCode)) return fail("quota", "공공데이터 API의 조회 한도에 도달했습니다. 잠시 후 다시 확인해 주세요.", 503);
          if (["20", "30", "31", "32"].includes(apiCode)) return fail("auth", "공공데이터 API 인증 설정을 확인해야 합니다. 관리자에게 문의해 주세요.", 503);
          return fail("upstream", "공공데이터 API가 정상 조회 결과를 반환하지 않았습니다.");
        }
        const items = body.items;
        const item = Array.isArray(items) ? items : object(items).item;
        const rows: unknown[] = Array.isArray(item) ? item : item && typeof item === "object" ? [item] : [];
        const total = noData && body.totalCount == null ? 0 : Number(body.totalCount);
        if (!Number.isSafeInteger(total) || total < 0 || total !== rows.length || rows.some(value => {
          const row = object(value);
          return row.lineNm !== "2호선" || row.stnCd !== code || row.stnNm !== station.name;
        }) || (noData && total !== 0)) return fail("mismatch", "응답의 역 코드 또는 데이터 개수가 일치하지 않아 표시를 중단했습니다.");
        const hidden = [key, encodeURIComponent(key), env.SUBWAY_FACILITY_API_KEY ?? "", env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ""].filter(Boolean);
        const text = (value: unknown): string | null => {
          if (typeof value !== "string" || !value.trim()) return null;
          let safe = value;
          for (const secret of hidden) safe = safe.split(secret).join("[비공개]");
          return safe;
        };
        const restrooms: Restroom[] = rows.map(value => {
          const row = object(value);
          return { facilityName: text(row.fcltNm), facilityNumber: text(row.fcltNo), detailLocation: text(row.dtlPstn),
            floor: text(row.stnFlr), groundType: text(row.grndUdgdSe), nearbyEntrances: text(row.vcntEntrcNo),
            gateSide: text(row.gateInoutSe), restroomType: text(row.rstrmInfo), wheelchairAccess: text(row.whlchrAcsPsbltyYn), referenceDate: text(row.crtrYmd) };
        });
        const data: FacilityData = { status: total === 0 ? "empty" : "ok", lineCode: "02호선", stationCode: code,
          stationName: RESTROOM_STATIONS[code], membershipId: memberId, source: FACILITY_SOURCE, fetchedAt: new Date(now()).toISOString(), restrooms };
        return { body: data, http: 200 };
      } catch (cause) {
        const name = cause instanceof Error ? cause.name : "";
        const failureKind = name === "TimeoutError" || name === "AbortError" ? "timeout" : name === "SyntaxError" ? "invalid_json" : name === "TypeError" ? "type_error" : "network";
        return fail("network", "외부 서버의 연결 또는 응답을 확인하지 못했습니다. 자동 재시도하지 않습니다.", 502, failureKind);
      }
    };
    const task = run();
    pending.set(code, { memberId, result: task });
    try {
      const result = await task;
      // Mapping errors cannot poison a valid station cache with a forged UUID.
      if (!(result.body.status === "error" && result.body.code === "mapping")) {
        cache.set(code, { memberId, until: now() + (result.http === 200 ? TTL : ERROR_TTL), result });
      }
      return response(result);
    } finally { pending.delete(code); }
  };
}
