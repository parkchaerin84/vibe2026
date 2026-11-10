import test from "node:test";
import assert from "node:assert/strict";
import { createFacilityHandler, type FacilityEnv, type FacilityDiagnostic } from "../server/facilities";
import type { FacilityData } from "../lib/facilities";
import { RESTROOM_STATIONS, SUPPORTED_RESTROOMS, RESTROOM_COVERAGE } from "../lib/facilities";
import metadata from "../lib/transit/share-stations.json";
import coverage from "../lib/facilities-coverage.json";

// Isolated responses based on the reviewed schema; never served as production fallback.
const member = "11111111-1111-4111-8111-111111111111";
const key = "TEST_ONLY_PRIVATE_KEY_0123456789+/=";
const env: FacilityEnv = { SUBWAY_FACILITY_API_KEY: key, NEXT_PUBLIC_SUPABASE_URL: "https://gavsuuazjauzjeyjhoao.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_TEST_ONLY" };
const request = (code = "0222", id = member) => new Request(`https://example.invalid/api/facilities/restrooms?${new URLSearchParams({ lineCode: "02호선", stationCode: code, membershipId: id })}`);
const row = { lineNm: "2호선", stnCd: "0222", stnNm: "강남", fcltNm: "TEST_ONLY_FACILITY", fcltNo: "TEST_ONLY_1",
  dtlPstn: "TEST_ONLY_DETAIL 1,2", stnFlr: "B1", grndUdgdSe: "지하", vcntEntrcNo: "1", gateInoutSe: "내부", rstrmInfo: "TEST_ONLY_TYPE", whlchrAcsPsbltyYn: "Y", crtrYmd: "20210527" };
const api = (rows: unknown[] = [row], total = rows.length) => ({ header: { resultCode: "00", resultMsg: "NORMAL_CODE" }, body: { totalCount: total, items: { item: rows } } });
function harness(options: { db?: unknown; upstream?: unknown; status?: number; dbStatus?: number; dbText?: string; apiText?: string; dbThrows?: Error; redirectLocation?: string; throws?: boolean; hold?: Promise<void>; code?: string } = {}) {
  const code = options.code ?? "0222";
  const name = RESTROOM_STATIONS[code];
  const calls: { host: string; code: string | null }[] = [];
  const diagnostics: FacilityDiagnostic[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input)); calls.push({ host: url.hostname, code: url.searchParams.get("stnCd") });
    assert.notEqual(init?.redirect, "follow");
    assert.equal(init?.redirect, "manual");
    if (url.hostname.endsWith("supabase.co")) {
      assert.equal(url.protocol, "https:");
      assert.equal(url.searchParams.get("id"), `eq.${member}`);
      assert.equal(url.searchParams.get("source_code"), `eq.02호선:${code}`);
      assert.doesNotMatch(url.searchParams.get("select")!, /owner_id|\*/);
      if (options.dbThrows) throw options.dbThrows;
      if (options.dbStatus && options.dbStatus >= 300 && options.dbStatus < 400) return new Response(null, { status: options.dbStatus, headers: { Location: options.redirectLocation ?? "https://example.invalid" } });
      if (options.dbText !== undefined) return new Response(options.dbText, { status: options.dbStatus ?? 200 });
      return Response.json(options.db ?? [{ id: member, source_dataset: "seoul_metro_oa15442", source_code: `02호선:${code}`,
        stations: { name, source_dataset: "seoul_metro_oa15442", source_code: `02호선:${code}` },
        lines: { name: "2호선", source_dataset: "seoul_metro_oa15442", source_code: "02호선" } }], { status: options.dbStatus ?? 200 });
    }
    assert.equal(url.origin, "https://apis.data.go.kr");
    assert.equal(url.pathname, "/B553766/facility/getFcRstrm");
    assert.equal(url.searchParams.get("serviceKey"), key);
    assert.equal(url.searchParams.get("lineNm"), "2호선");
    assert.equal(url.searchParams.get("stnCd"), code);
    await options.hold;
    if (options.throws) throw new Error(`PRIVATE_ERROR ${key} ${url}`);
    if (options.status && options.status >= 300 && options.status < 400) return new Response(null, { status: options.status, headers: { Location: options.redirectLocation ?? "https://example.invalid" } });
    if (options.apiText !== undefined) return new Response(options.apiText, { status: options.status ?? 200 });
    return Response.json(options.upstream ?? api([{ ...row, stnCd: code, stnNm: name }]), { status: options.status ?? 200 });
  };
  let clock = Date.parse("2026-11-08T00:00:00Z");
  const handle = createFacilityHandler({ fetcher, now: () => clock, onDiagnostic: diagnostic => diagnostics.push(diagnostic) });
  return { handle, calls, diagnostics, advance: (ms: number) => { clock += ms; } };
}

test("server verifies DB membership then queries official HTTPS; original location fields remain separate", async () => {
  const h = harness(); const response = await h.handle(request(), env);
  const body = await response.json() as FacilityData;
  assert.equal(response.status, 200); assert.equal(body.status, "ok");
  assert.equal(body.stationCode, "0222"); assert.equal(body.membershipId, member);
  assert.equal(body.restrooms[0].detailLocation, row.dtlPstn);
  assert.equal(body.restrooms[0].nearbyEntrances, "1");
  assert.equal(body.restrooms[0].floor, "B1");
  assert.equal(body.restrooms[0].referenceDate, "20210527");
  assert.equal(h.calls.length, 2);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("unsupported stations, wrong lines, malformed IDs and injected URL params never call upstream", async () => {
  const h = harness();
  for (const req of [request("9999"), request("__proto__"), request("0222", "invalid"),
    new Request(request().url.replace("02%ED%98%B8%EC%84%A0", "I11D1")),
    new Request(request().url + "&serviceKey=FORGED"), new Request(request().url, { method: "POST" })]) {
    assert.ok((await h.handle(req, env)).status >= 400);
  }
  assert.equal(h.calls.length, 0);
});

test("missing key, secret Supabase key and Tokyo project block all network calls", async () => {
  const h = harness();
  for (const change of [{ SUBWAY_FACILITY_API_KEY: "" }, { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_TEST_ONLY" }, { NEXT_PUBLIC_SUPABASE_URL: "https://goadyivlpedkphlqsvbl.supabase.co" }]) {
    const r = await h.handle(request(), { ...env, ...change }); assert.equal(r.status, 503);
    assert.equal((await r.json()).code, "configuration");
  }
  assert.equal(h.calls.length, 0);
});

test("unmatched or Shinbundang Gangnam mapping does not query the facility API", async () => {
  for (const db of [[], [{ id: member, source_code: "I11D1:D007", stations: { name: "강남" }, lines: { name: "신분당선" } }]]) {
    const h = harness({ db }); const r = await h.handle(request(), env);
    assert.equal((await r.json()).code, "mapping"); assert.equal(h.calls.length, 1);
  }
});

test("empty successful response differs from API/HTTP/network errors", async () => {
  const empty = await harness({ upstream: api([]) }).handle(request(), env);
  assert.equal(empty.status, 200); assert.equal((await empty.json()).status, "empty");
  for (const options of [{ upstream: { header: { resultCode: "30", resultMsg: key } } }, { status: 403 }, { throws: true }]) {
    const h = harness(options); const r = await h.handle(request(), env); const text = await r.text();
    assert.equal(r.status, options.upstream ? 503 : 502); assert.equal(JSON.parse(text).status, "error");
    assert.ok(!text.includes(key)); assert.ok(!text.includes("serviceKey=")); assert.equal(h.calls.length, 2);
  }
});

test("wrong station response or incomplete pagination is rejected rather than shown as real data", async () => {
  for (const upstream of [api([{ ...row, stnNm: "잠실" }]), api([{ ...row, stnCd: "222" }]), api([{ ...row, lineNm: "신분당선" }]), api([row], 101)]) {
    const h = harness({ upstream }); const r = await h.handle(request(), env);
    assert.equal((await r.json()).code, "mismatch");
  }
});

test("cached responses preserve original fetch time; expire after 10 minutes", async () => {
  const h = harness(); const first = await (await h.handle(request(), env)).json();
  h.advance(60_000); const second = await (await h.handle(request(), env)).json();
  assert.deepEqual(second, first); assert.equal(h.calls.length, 2);
  h.advance(10 * 60_000); await h.handle(request(), env); assert.equal(h.calls.length, 4);
});

test("duplicate in-flight requests share one lookup; failed requests have a short cooldown", async () => {
  let release!: () => void;
  const hold = new Promise<void>(resolve => { release = resolve; });
  const h = harness({ hold }); const first = h.handle(request(), env), second = h.handle(request(), env);
  release(); await Promise.all([first, second]); assert.equal(h.calls.length, 2);
  const failed = harness({ status: 503 }); await failed.handle(request(), env); await failed.handle(request(), env);
  assert.equal(failed.calls.length, 2); failed.advance(31_000); await failed.handle(request(), env); assert.equal(failed.calls.length, 4);
});

test("accidental key echo in allowed text fields is redacted; absent fields remain null", async () => {
  const h = harness({ upstream: api([{ ...row, dtlPstn: `test ${key}`, stnFlr: "", vcntEntrcNo: null }]) });
  const text = await (await h.handle(request(), env)).text(); assert.ok(!text.includes(key));
  const body = JSON.parse(text); assert.equal(body.restrooms[0].floor, null); assert.equal(body.restrooms[0].nearbyEntrances, null);
});

test("coverage contains all 43 main and 8 branch stations with exact reviewed codes and names", () => {
  assert.equal(Object.keys(RESTROOM_STATIONS).length, 51);
  assert.equal(Object.keys(SUPPORTED_RESTROOMS).length, 50);
  assert.equal(coverage.totalRows, 57);
  assert.deepEqual(RESTROOM_COVERAGE.empty, ["까치산"]);
  assert.equal(coverage.stations.filter(s => s.branch === "main").length, 43);
  assert.equal(coverage.stations.filter(s => s.branch !== "main").length, 8);
  for (const station of metadata.line2) {
    const code = station.sourceCode.split(":")[1];
    assert.equal(RESTROOM_STATIONS[code], station.name);
    assert.equal(coverage.stations.find(s => s.code === code)?.branch, station.branch);
  }
  // This is a verification manifest, never a stale-location fallback for API errors.
  assert.doesNotMatch(JSON.stringify(coverage), /dtlPstn|serviceKey|membershipId/);
});

test("each audited station, including irregular branch codes, validates membership and accepts its own response", async () => {
  for (const [code, name] of Object.entries(RESTROOM_STATIONS)) {
    const h = harness({ code }); const r = await h.handle(request(code), env);
    assert.equal(r.status, 200, code);
    const data = await r.json(); assert.equal(data.stationCode, code); assert.equal(data.stationName, name);
    assert.equal(h.calls.length, 2);
  }
});

test("Kkachisan can be queried afresh; successful zero rows and documented no-data code are empty, not failure", async () => {
  for (const upstream of [api([]), { header: { resultCode: "03", resultMsg: "NODATA_ERROR" } }]) {
    const h = harness({ code: "0200", upstream });
    const first = await h.handle(request("0200"), env);
    assert.equal(first.status, 200); const body = await first.json();
    assert.equal(body.status, "empty"); assert.equal(body.stationName, "까치산"); assert.deepEqual(body.restrooms, []);
    await h.handle(request("0200"), env); assert.equal(h.calls.length, 2);
  }
});

test("inconsistent no-data payload is rejected; quota and authorization failures are never empty", async () => {
  const invalid = await harness({ upstream: { ...api(), header: { resultCode: "03" } } }).handle(request(), env);
  assert.equal((await invalid.json()).code, "mismatch");
  for (const [apiCode, expected] of [["22", "quota"], ["23", "quota"], ["20", "auth"], ["30", "auth"], ["31", "auth"], ["32", "auth"]]) {
    const h = harness({ upstream: { header: { resultCode: apiCode, resultMsg: key } } });
    const r = await h.handle(request(), env); assert.equal(r.status, 503);
    const text = await r.text(); assert.equal(JSON.parse(text).code, expected); assert.ok(!text.includes(key));
  }
});

test("a cached main-line station cannot leak into another station or branch selection", async () => {
  const dbRequests: string[] = [], apiRequests: string[] = [];
  const fetcher: typeof fetch = async input => {
    const url = new URL(String(input));
    if (url.hostname.endsWith("supabase.co")) {
      const code = url.searchParams.get("source_code")!.split(":")[1]; dbRequests.push(code);
      return Response.json([{ id: member, source_dataset: "seoul_metro_oa15442", source_code: `02호선:${code}`,
        stations: { name: RESTROOM_STATIONS[code], source_dataset: "seoul_metro_oa15442", source_code: `02호선:${code}` },
        lines: { name: "2호선", source_dataset: "seoul_metro_oa15442", source_code: "02호선" } }]);
    }
    const code = url.searchParams.get("stnCd")!; apiRequests.push(code);
    return Response.json(code === "0200" ? api([]) : api([{ ...row, stnCd: code, stnNm: RESTROOM_STATIONS[code] }]));
  };
  const handle = createFacilityHandler({ fetcher });
  for (const code of ["0201", "0250", "0200", "0201"]) {
    const body = await (await handle(request(code), env)).json();
    assert.equal(body.stationCode, code); assert.equal(body.stationName, RESTROOM_STATIONS[code]);
    assert.equal(body.status, code === "0200" ? "empty" : "ok");
  }
  assert.deepEqual(apiRequests, ["0201", "0250", "0200"]); assert.deepEqual(dbRequests, apiRequests);
});

test("DB redirects are rejected without following Location, querying the facility API or exposing credentials", async () => {
  for (const status of [300, 301, 302, 303, 304, 307, 308, 399]) {
    const h = harness({ dbStatus: status, redirectLocation: `https://example.invalid/?serviceKey=${encodeURIComponent(key)}` });
    const r = await h.handle(request(), env); const body = await r.json();
    assert.equal(r.status, 502); assert.equal(body.code, "redirect"); assert.equal(body.status, "error");
    assert.equal(h.calls.length, 1);
    assert.equal(h.diagnostics[0].stage, "db_fetch"); assert.equal(h.diagnostics[0].upstreamStatus, status);
    assert.doesNotMatch(JSON.stringify([body, h.diagnostics]), /example\.invalid|serviceKey=|TEST_ONLY_PRIVATE_KEY/);
    await h.handle(request(), env); assert.equal(h.calls.length, 1); // Failure cooldown, no retry.
  }
});

test("facility API redirects never turn into data or forward the service key to another host", async () => {
  for (const status of [300, 301, 302, 303, 304, 307, 308, 399]) {
    const h = harness({ status, redirectLocation: `https://example.invalid/?serviceKey=${encodeURIComponent(key)}` });
    const r = await h.handle(request(), env); const body = await r.json();
    assert.equal(r.status, 502); assert.equal(body.code, "redirect"); assert.equal(h.calls.length, 2);
    assert.equal(h.diagnostics[0].stage, "api_fetch"); assert.equal(h.diagnostics[0].upstreamStatus, status);
    assert.doesNotMatch(JSON.stringify([body, h.diagnostics]), /example\.invalid|serviceKey=|TEST_ONLY_PRIVATE_KEY/);
  }
});

test("diagnostics distinguish request and JSON failures without logging raw errors or responses", async () => {
  const cases = [
    { options: { dbThrows: new TypeError(`PRIVATE_ERROR ${key}`) }, stage: "db_fetch", kind: "type_error", http: undefined, count: 1 },
    { options: { dbThrows: new DOMException(`PRIVATE_ERROR ${key}`, "TimeoutError") }, stage: "db_fetch", kind: "timeout", http: undefined, count: 1 },
    { options: { dbText: `PRIVATE_BODY ${key}` }, stage: "db_json", kind: "invalid_json", http: 200, count: 1 },
    { options: { throws: true }, stage: "api_fetch", kind: "network", http: undefined, count: 2 },
    { options: { apiText: `<error>${key}</error>` }, stage: "api_json", kind: "invalid_json", http: 200, count: 2 },
  ];
  for (const { options, stage, kind, http, count } of cases) {
    const h = harness(options); const r = await h.handle(request(), env); const body = await r.json();
    assert.equal(r.status, 502); assert.equal(body.code, "network");
    assert.equal(h.calls.length, count); assert.equal(h.diagnostics.length, 1);
    assert.equal(h.diagnostics[0].stage, stage); assert.equal(h.diagnostics[0].failureKind, kind);
    assert.equal(h.diagnostics[0].upstreamStatus, http);
    assert.doesNotMatch(JSON.stringify([body, h.diagnostics]), /PRIVATE_ERROR|PRIVATE_BODY|serviceKey=|TEST_ONLY_PRIVATE_KEY|sb_publishable_/);
  }
});

test("diagnostics only log approved API codes and do not change the response if logging fails", async () => {
  const h = harness({ upstream: { header: { resultCode: key, resultMsg: key } } });
  await h.handle(request(), env);
  assert.equal(h.diagnostics[0].apiCode, "other"); assert.ok(!JSON.stringify(h.diagnostics).includes(key));
  const handle = createFacilityHandler({ fetcher: async () => new Response(null, { status: 302 }), onDiagnostic: () => { throw new Error("TEST_ONLY_LOG_FAILURE"); } });
  const r = await handle(request(), env); assert.equal(r.status, 502); assert.equal((await r.json()).code, "redirect");
});
