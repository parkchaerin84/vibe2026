import test from "node:test";
import assert from "node:assert/strict";
import { ACTIVE_LINE_KEY, VISIBLE_LINES } from "../lib/transit/service-scope";
import { SHARE_LINES } from "../lib/transit/share-routes";
import { availableFavorite, changeFavorites, parseFavorites } from "../lib/transit/favorites";

const names = new Set(["강남", "잠실", "성수", "신설동"]);
const sd = { id: "same-id", lineName: "신분당선", lineColor: "#test", stationName: "강남", destinationName: "판교", extra: { retained: true } };
const l2 = { id: "same-id", lineName: "2호선", lineColor: "#test", stationName: "강남", destinationName: "잠실" };

test("only Line 2 is visible while both reusable line definitions are preserved", () => {
  assert.equal(ACTIVE_LINE_KEY, "line2");
  assert.deepEqual(VISIBLE_LINES.map(l => l.key), ["line2"]);
  assert.equal(VISIBLE_LINES[0].stations.length, 51);
  assert.equal(SHARE_LINES.find(l => l.key === "shinbundang")!.stations.length, 16);
});

test("old Shinbundang and unknown entries survive Line 2 favorite additions and removals", () => {
  const unknown = { legacy: ["do not discard"] };
  const raw = JSON.stringify([sd, unknown]);
  const added = changeFavorites(raw, names, { add: l2 });
  assert.deepEqual(added, [sd, unknown, l2]);
  // Same old ID in a different line must not cause deletion of the Shinbundang record.
  assert.deepEqual(changeFavorites(JSON.stringify(added), names, { remove: l2.id }), [sd, unknown]);
  assert.equal(availableFavorite(sd, names), false);
});

test("same station name is never enough to apply an old line's favorite", () => {
  const old = { ...sd, destinationName: "잠실" };
  assert.equal(availableFavorite(old, names), false);
  assert.equal(availableFavorite(l2, names), true);
  assert.equal(availableFavorite({ ...l2, stationName: "unknown station" }, names), false);
});

test("adding to latest storage preserves intervening entries and avoids duplicate routes", () => {
  const raw = JSON.stringify([sd, l2]);
  assert.deepEqual(changeFavorites(raw, names, { add: { ...l2, id: "new-id" } }), [sd, l2]);
  assert.throws(() => changeFavorites(raw, names, { add: { ...l2, lineName: "신분당선" } }));
});

test("corrupt or non-array storage blocks changes; no reset-to-empty fallback", () => {
  assert.deepEqual(parseFavorites(null), []);
  for (const raw of ["broken", "{}", "null"]) {
    assert.throws(() => parseFavorites(raw));
    assert.throws(() => changeFavorites(raw, names, { add: l2 }));
  }
});
