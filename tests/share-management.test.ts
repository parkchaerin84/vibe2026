import test from "node:test";
import assert from "node:assert/strict";
import type { SeatShareRow } from "../lib/supabase/database";
import { ownShareCards } from "../lib/transit/share-management";

// Isolated fixtures; never added to a live database or shown as real reports.
const now = Date.parse("2026-01-01T00:10:00Z");
const row: SeatShareRow = { id: "mine", line_id: "line2-test", car_number: 3,
  current_line_station_id: "member-a", exit_line_station_id: "member-b", direction_label: "내선순환",
  created_at: "2026-01-01T00:00:00Z", expires_at: "2026-01-01T00:30:00Z" };

test("management excludes other authors, expired reports and hidden-line reports", () => {
  const rows = [row, { ...row, id: "another-author" },
    { ...row, id: "other-line", line_id: "shinbundang-test" },
    { ...row, id: "expired", expires_at: new Date(now).toISOString() }];
  const ids = ["mine", "other-line", "expired"];
  assert.deepEqual(ownShareCards(rows, ids, "line2-test", now), [row]);
  assert.deepEqual(ownShareCards(rows, [], "line2-test", now), []);
  assert.deepEqual(ownShareCards(rows, ids, undefined, now), []);
});

test("management keeps the author's other branch visible and removes it at original expiry", () => {
  const branch = { ...row, id: "my-branch", direction_label: "신설동 방면", current_line_station_id: "branch-a" };
  const rows = [row, branch];
  assert.deepEqual(ownShareCards(rows, [branch.id], "line2-test", now), [branch]);
  assert.deepEqual(ownShareCards(rows, [branch.id], "line2-test", Date.parse(branch.expires_at)), []);
  assert.equal(rows.length, 2);
});
