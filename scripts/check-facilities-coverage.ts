// Explicit, one-shot READ ONLY audit. Never imported by the website or run by build/test.
// Persist a sanitized report outside the repo to avoid accidentally repeating quota usage.
import { loadEnvConfig } from "@next/env";
import { access, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import metadata from "../lib/transit/share-stations.json";

const output = resolve("../../outputs/facilities-line2-coverage.json");
async function main() {
  try { await access(output); console.log("Existing audit found; no network requests made."); return; } catch { /* First explicit audit. */ }
  loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
  let key = process.env.SUBWAY_FACILITY_API_KEY?.trim() ?? "";
  if (/%[0-9a-f]{2}/i.test(key)) key = decodeURIComponent(key);
  const origin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  if (!key || /\s/.test(key) || origin !== "https://gavsuuazjauzjeyjhoao.supabase.co" || !/^sb_publishable_\S+$/.test(publicKey)) throw new Error();
  console.log("Required environment: present (values hidden).");
  const db = new URL(origin + "/rest/v1/line_stations");
  db.searchParams.set("select", "id,source_code,source_dataset,branch_code,stations!inner(name,source_code,source_dataset),lines!inner(name,source_code,source_dataset)");
  db.searchParams.set("source_dataset", "eq.seoul_metro_oa15442");
  db.searchParams.set("lines.source_code", "eq.02호선");
  const dr = await fetch(db, { headers: { apikey: publicKey }, redirect: "error", signal: AbortSignal.timeout(20000) });
  if (!dr.ok) throw new Error();
  const memberships = await dr.json();
  if (!Array.isArray(memberships) || memberships.length !== 51 || metadata.line2.length !== 51 ||
      new Set(memberships.map(r => r.source_code)).size !== 51 || metadata.line2.some(s => {
        const r = memberships.find(r => r.source_code === s.sourceCode);
        return !r || r.branch_code !== s.branch || r.stations.name !== s.name || r.stations.source_code !== s.sourceCode ||
          r.stations.source_dataset !== "seoul_metro_oa15442" || r.lines.source_dataset !== "seoul_metro_oa15442" || r.lines.source_code !== "02호선" || r.lines.name !== "2호선";
      })) throw new Error();
  // Only a line filter: optional station filter omitted to cover all 51 in ONE request.
  const url = new URL("https://apis.data.go.kr/B553766/facility/getFcRstrm");
  for (const [k, v] of Object.entries({ serviceKey: key, dataType: "JSON", pageNo: "1", numOfRows: "1000", lineNm: "2호선" })) url.searchParams.set(k, v);
  // A durable marker prevents an accidental rerun even if the request fails midway.
  await writeFile(output, JSON.stringify({ state: "started", startedAt: new Date().toISOString(), facilityRequestsAttempted: 1, automaticRetry: false }, null, 2), { flag: "wx" });
  const result = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(30000) });
  const raw = await result.json();
  const root = raw.response ?? raw;
  const items = root.body?.items;
  const item = Array.isArray(items) ? items : items?.item;
  const rows: Record<string, unknown>[] = Array.isArray(item) ? item : item && typeof item === "object" ? [item] : [];
  const total = Number(root.body?.totalCount);
  const complete = result.ok && ["00", "0"].includes(String(root.header?.resultCode)) && Number.isSafeInteger(total) && total >= 0 && total === rows.length;
  const hidden = [key, encodeURIComponent(key), process.env.SUBWAY_FACILITY_API_KEY ?? "", publicKey].filter(Boolean);
  const fields = ["lineNm", "stnCd", "stnNm", "fcltNm", "fcltNo", "dtlPstn", "stnFlr", "grndUdgdSe", "vcntEntrcNo", "gateInoutSe", "rstrmInfo", "whlchrAcsPsbltyYn", "crtrYmd"];
  const clean = (r: Record<string, unknown>) => Object.fromEntries(fields.map(f => [f, typeof r[f] === "string" ? hidden.reduce((s, k) => s.split(k).join("[redacted]"), r[f] as string) : null]));
  const stations = metadata.line2.map(s => {
    const code = s.sourceCode.split(":")[1];
    const found = rows.filter(r => r.stnCd === code);
    const valid = found.every(r => r.lineNm === "2호선" && r.stnNm === s.name);
    return { stationCode: code, name: s.name, branch: s.branch,
      status: !complete ? "error" : !valid ? "mismatch" : found.length ? "verified" : "empty",
      count: found.length, rows: found.map(clean) };
  });
  const report = { checkedAt: new Date().toISOString(), source: "https://www.data.go.kr/data/15143841/openapi.do", facilityRequestsAttempted: 1,
    databaseReadRequests: 1, http: result.status, apiCode: String(root.header?.resultCode ?? "missing").slice(0,8), totalCount: total, received: rows.length, complete,
    unexpectedRows: rows.filter(r => !metadata.line2.some(s => s.sourceCode === `02호선:${r.stnCd}`) || r.lineNm !== "2호선").map(clean), stations };
  await writeFile(output, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ http: report.http, apiCode: report.apiCode, complete, totalCount: total, received: rows.length,
    statuses: Object.fromEntries(["verified", "empty", "mismatch", "error"].map(status => [status, stations.filter(s => s.status === status).length])),
    unexpectedRows: report.unexpectedRows.length,
    review: stations.filter(s => s.status !== "verified").map(({ rows: _rows, ...s }) => s) }, null, 2));
}
main().catch(() => { console.error("Audit stopped safely; no automatic retry. Credentials, raw error and request URL withheld."); process.exitCode = 1; });
