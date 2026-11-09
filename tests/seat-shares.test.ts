import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import type { Database, SeatShareRow } from "../lib/supabase/database";
import { deleteSeatShare, insertSeatShare, loadMyShareIds, loadSeatShares, unexpiredShares, validateShare } from "../lib/supabase/seat-shares";
import { SHARE_LINES, type ShareReference } from "../lib/transit/share-routes";

// Isolated HTTP fixtures only; never inserted into the live service.
const reference: ShareReference = { lineKey: "shinbundang", lineId: "line-test", lineName: "신분당선", stations: SHARE_LINES[0].stations.map((s, i) => ({ membershipId: `member-${i}`, stationId: `station-${i}`, name: s.name, sourceCode: s.sourceCode, source: "https://example.invalid" })) };
const draft = { line_id: reference.lineId, current_line_station_id: "member-0", exit_line_station_id: "member-2", car_number: 3, direction_label: "광교 방면" };
const row: SeatShareRow = { ...draft, id: "share-test", created_at: "2026-01-01T00:00:00Z", expires_at: "2026-01-01T00:30:00Z" };
function client(handler: (url: URL, init?: RequestInit) => Response) {
  return createClient<Database>("https://testproject.supabase.co", "sb_publishable_TEST_ONLY", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (url, init) => handler(new URL(String(url)), init) },
  });
}
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

test("public shares read explicit public columns, no owner or auth request, and no aggregation", async () => {
  const c = client(url => {
    assert.ok(url.pathname.endsWith("/seat_shares"));
    assert.doesNotMatch(url.searchParams.get("select")!, /owner_id|\*/);
    assert.equal(url.searchParams.get("line_id"), "eq.line-test");
    return json([row, { ...row, id: "other-train" }]);
  });
  assert.equal((await loadSeatShares(reference.lineId, c)).length, 2);
});
test("empty data and read errors remain distinct", async () => {
  assert.deepEqual(await loadSeatShares(reference.lineId, client(() => json([]))), []);
  await assert.rejects(loadSeatShares(reference.lineId, client(() => json({ code: "42501" }, 403))), { code: "read" });
});
test("insert uses membership IDs and strips caller-supplied ownership/timestamps", async () => {
  let writes = 0;
  const c = client((url, init) => {
    writes++; assert.equal(init?.method, "POST");
    assert.deepEqual(JSON.parse(String(init?.body)), draft);
    assert.doesNotMatch(url.searchParams.get("select")!, /owner_id/);
    return json(row, 201);
  });
  assert.equal((await insertSeatShare({ ...draft, owner_id: "forged", expires_at: "2099" } as typeof draft, reference, c)).id, row.id);
  assert.equal(writes, 1);
});
test("invalid station membership, same station, car and direction rejected before writes", async () => {
  const c = client(() => { assert.fail("must not send invalid input"); });
  for (const change of [{ line_id: "wrong" }, { current_line_station_id: "station-0" }, { exit_line_station_id: "member-0" }, { car_number: 0 }, { car_number: 1.5 }, { direction_label: "invalid" }]) {
    await assert.rejects(insertSeatShare({ ...draft, ...change }, reference, c), { code: "validation" });
  }
});
test("active-share and rate-limit errors are translated without leaking arbitrary messages", async () => {
  await assert.rejects(insertSeatShare(draft, reference, client(() => json({ code: "P0001", message: "An active share already exists" }, 400))), { code: "active" });
  await assert.rejects(insertSeatShare(draft, reference, client(() => json({ code: "P0001", message: "Daily write limit exceeded" }, 400))), { code: "limit" });
  await assert.rejects(insertSeatShare(draft, reference, client(() => json({ code: "unknown", message: "PRIVATE_TEST_TOKEN" }, 500))), error => !String(error).includes("PRIVATE_TEST_TOKEN"));
});
test("failed mutation is not automatically retried", async () => {
  let attempts = 0;
  await assert.rejects(insertSeatShare(draft, reference, client(() => { attempts++; return json({ code: "unknown" }, 503); })), { code: "write" });
  assert.equal(attempts, 1);
});
test("ownership lookup uses the narrow RPC and filters out other content kinds", async () => {
  const c = client(url => {
    assert.ok(url.pathname.endsWith("/rpc/my_content_ids"));
    return json([{ kind: "seat_shares", id: row.id }, { kind: "posts", id: "post-test" }]);
  });
  c.auth.getSession = async () => ({ data: { session: { user: { is_anonymous: true } } }, error: null }) as Awaited<ReturnType<typeof c.auth.getSession>>;
  assert.deepEqual(await loadMyShareIds(c), [row.id]);
});
test("delete filters by ID and requires an actually deleted returned row", async () => {
  await deleteSeatShare(row.id, client((url, init) => {
    assert.equal(init?.method, "DELETE"); assert.equal(url.searchParams.get("id"), `eq.${row.id}`);
    assert.equal(url.searchParams.get("select"), "id"); return json([{ id: row.id }]);
  }));
  await assert.rejects(deleteSeatShare("other-author", client(() => json([]))), { code: "not_deleted" });
});
test("reading own IDs without session does not signup or call RPC", async () => {
  assert.deepEqual(await loadMyShareIds(client(() => { assert.fail("no network without session"); })), []);
});
test("expiry boundary hides expired rows, never merges same-car reports", () => {
  assert.equal(unexpiredShares([row], Date.parse(row.expires_at) - 1).length, 1);
  assert.equal(unexpiredShares([row], Date.parse(row.expires_at)).length, 0);
  assert.equal(unexpiredShares([row, { ...row, id: "other-train" }], Date.parse(row.created_at)).length, 2);
  assert.equal(validateShare(draft, reference).car_number, 3);
});
