import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/supabase/database";
import { loadShareReference } from "../lib/supabase/share-reference";
import { insertSeatShare, validateShare } from "../lib/supabase/seat-shares";
import { SHARE_LINES, SHARE_ROUTES, reachableStations, stationsForRoute, type ShareLineKey, type ShareReference } from "../lib/transit/share-routes";

// Fake UUIDs/HTTP transport only. Never signs up or writes to the live database.
function reference(key: ShareLineKey): ShareReference {
  const line = SHARE_LINES.find(d => d.key === key)!;
  return { lineKey: key, lineId: `test-${key}`, lineName: line.name,
    stations: line.stations.map((s, i) => ({ name: s.name, sourceCode: s.sourceCode,
      membershipId: `${key}-membership-${i}`, stationId: `${key}-station-${i}`, source: "https://example.invalid" })) };
}
const line2 = reference("line2"), sd = reference("shinbundang");
const station = (data: ShareReference, code: string) => data.stations.find(s => s.sourceCode === code)!;
const main = SHARE_ROUTES.find(r => r.id === "line2-main")!;
const seongsu = SHARE_ROUTES.find(r => r.id === "line2-seongsu")!;
const sinjeong = SHARE_ROUTES.find(r => r.id === "line2-sinjeong")!;
function draft(data: ShareReference, from: string, to: string, direction: string) {
  return { line_id: data.lineId, current_line_station_id: station(data, from).membershipId,
    exit_line_station_id: station(data, to).membershipId, car_number: 3, direction_label: direction };
}

test("main loop includes 43 stops and closes at City Hall in both directions", () => {
  const from = station(line2, "02호선:0243").membershipId;
  assert.equal(stationsForRoute(line2, main).length, 43);
  assert.equal(reachableStations(line2, main, from, "내선순환")[0].name, "시청");
  assert.equal(reachableStations(line2, main, station(line2, "02호선:0201").membershipId, "외선순환")[0].name, "충정로");
  for (const d of main.directions) {
    const reachable = reachableStations(line2, main, from, d);
    assert.equal(reachable.length, 42);
    assert.equal(new Set(reachable.map(s => s.membershipId)).size, 42);
    assert.ok(!reachable.some(s => s.membershipId === from));
    assert.ok(!reachable.some(s => ["신설동", "까치산"].includes(s.name)));
  }
});

test("Gangnam and Jamsil directions agree with the verified next-station evidence", () => {
  for (const [code, inner, outer] of [["0222", "교대", "역삼"], ["0216", "잠실새내", "잠실나루"]]) {
    const current = station(line2, `02호선:${code}`).membershipId;
    assert.equal(reachableStations(line2, main, current, "내선순환")[0].name, inner);
    assert.equal(reachableStations(line2, main, current, "외선순환")[0].name, outer);
  }
});

test("branches include their junction once and follow topology rather than code sort", () => {
  assert.deepEqual(stationsForRoute(line2, seongsu).map(s => s.name), ["성수", "용답", "신답", "용두", "신설동"]);
  assert.deepEqual(stationsForRoute(line2, sinjeong).map(s => s.name), ["신도림", "도림천", "양천구청", "신정네거리", "까치산"]);
  assert.equal(stationsForRoute(line2, seongsu)[0].membershipId, station(line2, "02호선:0211").membershipId);
  assert.equal(stationsForRoute(line2, sinjeong)[0].membershipId, station(line2, "02호선:0234").membershipId);
  assert.deepEqual(reachableStations(line2, sinjeong, station(line2, "02호선:0200").membershipId, "까치산 방면"), []);
  assert.deepEqual(reachableStations(line2, seongsu, station(line2, "02호선:0211").membershipId, "성수 방면"), []);
});

test("Shinbundang remains separate and enforces terminal-bound direction", () => {
  assert.equal(validateShare(draft(sd, "I11D1:D007", "I11D1:D011", "광교 방면"), sd).direction_label, "광교 방면");
  assert.throws(() => validateShare(draft(sd, "I11D1:D007", "I11D1:D011", "신사 방면"), sd), { code: "validation" });
  assert.throws(() => validateShare(draft(sd, "I11D1:D004", "I11D1:D005", "신사 방면"), sd), { code: "validation" });
  const sdGangnam = station(sd, "I11D1:D007"), l2Gangnam = station(line2, "02호선:0222");
  assert.equal(sdGangnam.name, l2Gangnam.name);
  assert.notEqual(sdGangnam.membershipId, l2Gangnam.membershipId);
  assert.throws(() => validateShare({ ...draft(sd, "I11D1:D007", "I11D1:D011", "광교 방면"), current_line_station_id: l2Gangnam.membershipId }, sd), { code: "validation" });
});

test("both loop directions are valid; cross-branch/transfer/same-station and wrong direction are rejected", () => {
  for (const direction of main.directions) assert.doesNotThrow(() => validateShare(draft(line2, "02호선:0222", "02호선:0216", direction), line2));
  assert.doesNotThrow(() => validateShare(draft(line2, "02호선:0244", "02호선:0246", "신설동 방면"), line2));
  for (const d of [
    draft(line2, "02호선:0244", "02호선:0246", "성수 방면"),
    draft(line2, "02호선:0211", "02호선:0244", "内線"),
    draft(line2, "02호선:0211", "02호선:0244", "내선순환"),
    draft(line2, "02호선:0244", "02호선:0247", "신설동 방면"),
    draft(line2, "02호선:0244", "02호선:0212", "성수 방면"),
    draft(line2, "02호선:0222", "02호선:0222", "내선순환"),
  ]) assert.throws(() => validateShare(d, line2), { code: "validation" });
});

function transport(key: ShareLineKey, change?: (rows: Record<string, unknown>[]) => void) {
  const definition = SHARE_LINES.find(d => d.key === key)!;
  const data = reference(key);
  const calls: string[] = [];
  const client = createClient<Database>("https://testproject.supabase.co", "sb_publishable_TEST_ONLY", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, init) => {
      const url = new URL(String(input)); calls.push(url.pathname);
      assert.equal(init?.method, "GET");
      assert.ok(url.pathname.startsWith("/rest/v1/"));
      assert.doesNotMatch(url.searchParams.get("select")!, /owner_id|\*/);
      assert.equal(url.searchParams.get("source_dataset"), `eq.${definition.dataset}`);
      if (url.pathname.endsWith("/lines")) {
        assert.equal(url.searchParams.get("source_code"), `eq.${definition.code}`);
        return Response.json([{ id: data.lineId, name: data.lineName }]);
      }
      assert.equal(url.searchParams.get("line_id"), `eq.${data.lineId}`);
      const rows: Record<string, unknown>[] = data.stations.map((s, i) => ({ id: s.membershipId, station_id: s.stationId,
        line_id: data.lineId, source_dataset: definition.dataset, source_code: s.sourceCode,
        branch_code: definition.stations[i].branch,
        stations: { id: s.stationId, name: s.name, source_code: s.sourceCode, source_dataset: definition.dataset, source: s.source } }));
      change?.(rows);
      return Response.json(rows.reverse()); // Network order is deliberately not route order.
    } },
  });
  return { client, calls };
}

test("selected-line public reads validate 16/51 DB records without signup and reorder by reviewed topology", async () => {
  for (const key of ["shinbundang", "line2"] as const) {
    const { client, calls } = transport(key);
    const loaded = await loadShareReference(key, undefined, client);
    assert.deepEqual(loaded, reference(key));
    assert.equal(calls.length, 2);
  }
});

test("missing, duplicate, wrong branch, wrong FK, renamed and unknown station records fail closed", async () => {
  for (const change of [
    (rows: Record<string, unknown>[]) => { rows.pop(); },
    (rows: Record<string, unknown>[]) => { rows[1] = rows[0]; },
    (rows: Record<string, unknown>[]) => { rows[0].branch_code = "seongsu"; },
    (rows: Record<string, unknown>[]) => { rows[0].line_id = "another-line"; },
    (rows: Record<string, unknown>[]) => { rows[0].station_id = "wrong-station"; },
    (rows: Record<string, unknown>[]) => { (rows[0].stations as { name: string }).name = "UNVERIFIED_TEST_ONLY"; },
    (rows: Record<string, unknown>[]) => { rows[0].source_code = "02호선:9999"; },
  ]) await assert.rejects(loadShareReference("line2", undefined, transport("line2", change).client), { code: "incomplete" });
});

test("invalid route is rejected before any insert request", async () => {
  const { client, calls } = transport("line2");
  await assert.rejects(insertSeatShare(draft(line2, "02호선:0244", "02호선:0246", "성수 방면"), line2, client), { code: "validation" });
  assert.equal(calls.length, 0);
});
