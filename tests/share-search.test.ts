import test from "node:test";
import assert from "node:assert/strict";
import type { SeatShareRow } from "../lib/supabase/database";
import { searchShareCards, type ShareSearch } from "../lib/transit/share-search";
import { SHARE_LINES, SHARE_ROUTES, type ShareLineKey, type ShareReference } from "../lib/transit/share-routes";

// Isolated fixtures only: no Supabase requests or user data writes.
function reference(key: ShareLineKey): ShareReference {
  const line = SHARE_LINES.find(l => l.key === key)!;
  return { lineKey: key, lineId: `test-${key}`, lineName: line.name,
    stations: line.stations.map((s, i) => ({ name: s.name, sourceCode: s.sourceCode,
      membershipId: `${key}-membership-${i}`, stationId: `${key}-station-${i}`, source: "https://example.invalid" })) };
}
const line2 = reference("line2"), sd = reference("shinbundang");
const main = SHARE_ROUTES.find(r => r.id === "line2-main")!;
const branch = SHARE_ROUTES.find(r => r.id === "line2-seongsu")!;
const member = (code: string) => line2.stations.find(s => s.sourceCode === `02호선:${code}`)!.membershipId;
const now = Date.parse("2026-01-01T00:10:00Z");
const row: SeatShareRow = { id: "one-report", line_id: line2.lineId,
  current_line_station_id: member("0222"), exit_line_station_id: member("0220"), car_number: 3,
  direction_label: "외선순환", created_at: "2026-01-01T00:00:00Z", expires_at: "2026-01-01T00:30:00Z" };
const search: ShareSearch = { direction: "외선순환", carNumber: 3, exitStationId: "" };

test("search intersects direction and car; all exits include separate reports without grouping trains", () => {
  const another = { ...row, id: "separate-report", exit_line_station_id: member("0216") };
  const rows = [row, another, { ...row, id: "wrong-car", car_number: 4 }, { ...row, id: "wrong-direction", direction_label: "내선순환" }];
  assert.deepEqual(searchShareCards(rows, line2, main, search, now), [row, another]);
  assert.equal(rows.length, 4);
});

test("specific exit matches membership ID, never a same-name station on a different line", () => {
  const gangnam = member("0222");
  const sdGangnam = sd.stations.find(s => s.name === "강남")!.membershipId;
  const toGangnam = { ...row, current_line_station_id: member("0220"), exit_line_station_id: gangnam };
  const wrongMembership = { ...toGangnam, id: "other-line-station", exit_line_station_id: sdGangnam };
  const wrongLine = { ...toGangnam, id: "other-line", line_id: sd.lineId };
  assert.deepEqual(searchShareCards([toGangnam, wrongMembership, wrongLine], line2, main,
    { ...search, exitStationId: gangnam }, now), [toGangnam]);
  assert.deepEqual(searchShareCards([row], line2, main, { ...search, exitStationId: sdGangnam }, now), []);
});

test("expired, exact-expiry and invalid timestamp reports disappear even during active search", () => {
  const expiring = { ...row, expires_at: new Date(now + 1).toISOString() };
  const rows = [expiring, { ...row, id: "expired", expires_at: new Date(now).toISOString() },
    { ...row, id: "invalid", expires_at: "invalid" }];
  assert.deepEqual(searchShareCards(rows, line2, main, search, now), [expiring]);
  assert.deepEqual(searchShareCards(rows, line2, main, search, now + 1), []);
});

test("branch directions and memberships stay separate; clearing search restores that route only", () => {
  const branchRow = { ...row, id: "branch", current_line_station_id: member("0211"),
    exit_line_station_id: member("0246"), direction_label: "신설동 방면" };
  const rows = [row, branchRow, { ...row, id: "legacy-car", car_number: 11 }];
  assert.deepEqual(searchShareCards(rows, line2, branch, { direction: "신설동 방면", carNumber: 3, exitStationId: "" }, now), [branchRow]);
  assert.deepEqual(searchShareCards(rows, line2, branch, search, now), []);
  assert.deepEqual(searchShareCards(rows, line2, main, null, now).map(s => s.id), ["one-report", "legacy-car"]);
  assert.deepEqual(searchShareCards(rows, line2, main, { ...search, exitStationId: member("0246") }, now), []);
});

test("only integer search cars 1 through 10 are supported, including both endpoints", () => {
  for (const carNumber of [1, 10]) {
    const selected = { ...row, car_number: carNumber };
    assert.deepEqual(searchShareCards([selected], line2, main, { ...search, carNumber }, now), [selected]);
  }
  for (const carNumber of [0, 11, 1.5, NaN]) {
    assert.deepEqual(searchShareCards([row], line2, main, { ...search, carNumber }, now), []);
  }
});

test("missing references, mismatched lines and no matching reports return an empty list", () => {
  assert.deepEqual(searchShareCards([row], null, main, search, now), []);
  assert.deepEqual(searchShareCards([row], sd, main, search, now), []);
  assert.deepEqual(searchShareCards([], line2, main, search, now), []);
  assert.deepEqual(searchShareCards([row], line2, main, { ...search, carNumber: 9 }, now), []);
});

const branchRow = { ...row, id: "branch-report", current_line_station_id: member("0211"),
  exit_line_station_id: member("0246"), direction_label: "신설동 방면", car_number: 10,
  created_at: "2026-01-01T00:05:00Z" };
const sinjeongRow = { ...branchRow, id: "sinjeong-report", current_line_station_id: member("0234"),
  exit_line_station_id: member("0200"), direction_label: "까치산 방면", created_at: "2026-01-01T00:06:00Z" };

test("initial all-route list includes both branches, excludes expired/other-line reports, sorts newest without mutating input", () => {
  const rows = [row, branchRow, sinjeongRow, { ...row, id: "expired", expires_at: new Date(now).toISOString() },
    { ...row, id: "hidden-line", line_id: sd.lineId }];
  const original = [...rows];
  assert.deepEqual(searchShareCards(rows, line2, null, null, now), [sinjeongRow, branchRow, row]);
  assert.deepEqual(rows, original);
});

test("each filter is optional and partial conditions immediately narrow the all-route list", () => {
  const rows = [row, branchRow, sinjeongRow];
  assert.deepEqual(searchShareCards(rows, line2, null, { direction: "", carNumber: 10, exitStationId: "" }, now), [sinjeongRow, branchRow]);
  assert.deepEqual(searchShareCards(rows, line2, null, { direction: "外線", exitStationId: "" }, now), []);
  assert.deepEqual(searchShareCards(rows, line2, null, { direction: "外線", carNumber: 10, exitStationId: "" }, now), []);
  assert.deepEqual(searchShareCards(rows, line2, null, { direction: "신설동 방면", exitStationId: "" }, now), [branchRow]);
  assert.deepEqual(searchShareCards(rows, line2, null, { direction: "", exitStationId: member("0200") }, now), [sinjeongRow]);
  assert.deepEqual(searchShareCards(rows, line2, null, { direction: "", carNumber: 3, exitStationId: member("0246") }, now), []);
});

test("clearing every filter restores all routes and a report disappears at its original expiry", () => {
  const rows = [row, branchRow, sinjeongRow];
  assert.deepEqual(searchShareCards(rows, line2, branch, null, now), [branchRow]);
  assert.deepEqual(searchShareCards(rows, line2, null, { direction: "", exitStationId: "" }, now), [sinjeongRow, branchRow, row]);
  assert.deepEqual(searchShareCards(rows, line2, null, null, Date.parse(row.expires_at)), []);
});
