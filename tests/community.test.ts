import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import type { CommentRow, Database, PostRow } from "../lib/supabase/database";
import { SHARE_LINES, type ShareReference } from "../lib/transit/share-routes";
import { COMMENT_COLUMNS, POST_COLUMNS, createComment, createPost, deleteComment, deletePost, loadComments, loadMyCommunityIds, loadPost, loadPosts, updateComment, updatePost, validatePost } from "../lib/supabase/community";

// Isolated SDK transport tests: no live signup, content writes, SQL or DB changes.
const reference: ShareReference = { lineKey: "shinbundang", lineId: "test-line", lineName: "신분당선", stations: SHARE_LINES[0].stations.map((s, i) => ({ membershipId: `member-${i}`, stationId: `station-${i}`, name: s.name, source: "https://example.invalid", sourceCode: s.sourceCode })) };
const draft = { line_id: reference.lineId, line_station_id: "member-0", category: "기타", title: "TEST_ONLY", body: "TEST_ONLY_BODY" };
const post: PostRow = { ...draft, id: "post-test", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" };
const comment: CommentRow = { id: "comment-test", post_id: post.id, body: "TEST_ONLY", created_at: post.created_at, updated_at: post.updated_at };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
function client(handler: (url: URL, init?: RequestInit) => Response) {
  return createClient<Database>("https://testproject.supabase.co", "sb_publishable_TEST_ONLY", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, init) => handler(new URL(String(input)), init) },
  });
}

test("community public reads only allowed columns, use DB filters and never call Auth", async () => {
  const c = client((url, init) => {
    assert.ok(url.pathname.endsWith("/posts")); assert.equal(init?.method, "GET");
    assert.equal(url.searchParams.get("select"), POST_COLUMNS);
    assert.doesNotMatch(POST_COLUMNS, /owner_id|\*/);
    assert.equal(url.searchParams.get("category"), "eq.기타");
    assert.equal(url.searchParams.get("line_id"), "eq.test-line");
    assert.equal(url.searchParams.get("line_station_id"), "eq.member-0");
    return json([post]);
  });
  assert.deepEqual((await loadPosts({ category: "기타", lineId: reference.lineId, membershipId: "member-0" }, 0, c)).rows, [post]);
});

test("post/comment pagination reads only a bounded page and detects next page", async () => {
  const c = client(url => {
    assert.equal(url.searchParams.get("offset"), "20"); assert.equal(url.searchParams.get("limit"), "21");
    return json(Array.from({ length: 21 }, (_, i) => ({ ...post, id: `test-${i}` })));
  });
  const result = await loadPosts({}, 1, c);
  assert.equal(result.rows.length, 20); assert.equal(result.hasNext, true);
  await assert.rejects(loadPosts({}, -1, c), { code: "validation" });
  await assert.rejects(loadComments(post.id, 1.5, c), { code: "validation" });
});

test("no posts, missing detail, permission error and no comments are distinct", async () => {
  const empty = client(() => json([]));
  assert.deepEqual(await loadPosts({}, 0, empty), { rows: [], hasNext: false });
  assert.equal(await loadPost(post.id, empty), null);
  assert.deepEqual(await loadComments(post.id, 0, empty), { rows: [], hasNext: false });
  const denied = client(() => json({ code: "42501" }, 403));
  await assert.rejects(loadPost(post.id, denied), { code: "read" });
  await assert.rejects(loadPosts({}, 0, denied), { code: "read" });
  await assert.rejects(loadComments(post.id, 0, denied), { code: "read" });
});

test("comment read is scoped to post, stable ordered, and omits private identity", async () => {
  const result = await loadComments(post.id, 0, client(url => {
    assert.ok(url.pathname.endsWith("/comments"));
    assert.equal(url.searchParams.get("post_id"), "eq.post-test");
    assert.equal(url.searchParams.get("select"), COMMENT_COLUMNS);
    assert.equal(url.searchParams.get("order"), "created_at.asc,id.asc");
    assert.doesNotMatch(COMMENT_COLUMNS, /owner_id|\*/);
    return json([comment]);
  }));
  assert.deepEqual(result.rows, [comment]);
});

test("post inserts send only grant-allowed content and trim text", async () => {
  const forged = { ...draft, title: " TEST_ONLY ", owner_id: "forged", created_at: "2099", id: "forged" };
  const result = await createPost(forged, reference, client((url, init) => {
    assert.equal(init?.method, "POST"); assert.deepEqual(JSON.parse(String(init?.body)), draft);
    assert.equal(url.searchParams.get("select"), POST_COLUMNS); return json(post, 201);
  }));
  assert.equal(result.id, post.id);
});

test("reference and content validation rejects invalid writes before network", async () => {
  const c = client(() => { assert.fail("invalid data must not be sent"); });
  for (const invalid of [{ line_id: "wrong" }, { line_station_id: "station-0" }, { category: "직원" }, { title: " " }, { title: "a".repeat(101) }, { body: "a".repeat(5001) }]) {
    await assert.rejects(createPost({ ...draft, ...invalid }, reference, c), { code: "validation" });
  }
  assert.equal(validatePost({ ...draft, line_station_id: null }, reference).line_station_id, null);
  // PostgreSQL char_length counts code points, unlike JavaScript UTF-16 length.
  assert.equal(validatePost({ ...draft, title: "😀".repeat(100) }, reference).title.length, 200);
  await assert.rejects(createComment(post.id, " ", c), { code: "validation" });
  await assert.rejects(updateComment(comment, "a".repeat(2001), c), { code: "validation" });
});

test("post update includes record and version filters, strips forged fields", async () => {
  await updatePost(post, { ...draft, owner_id: "forged" } as typeof draft, reference, client((url, init) => {
    assert.equal(init?.method, "PATCH"); assert.equal(url.searchParams.get("id"), "eq.post-test");
    assert.equal(url.searchParams.get("updated_at"), `eq.${post.updated_at}`);
    assert.deepEqual(JSON.parse(String(init?.body)), draft);
    return json([{ ...post, updated_at: "2026-01-01T00:01:00Z" }]);
  }));
});

test("comment insert and update cannot move post or override author", async () => {
  await createComment(post.id, " TEST_ONLY ", client((url, init) => {
    assert.equal(init?.method, "POST");
    assert.deepEqual(JSON.parse(String(init?.body)), { post_id: post.id, body: "TEST_ONLY" });
    return json(comment, 201);
  }));
  await updateComment(comment, " EDITED ", client((url, init) => {
    assert.equal(init?.method, "PATCH"); assert.equal(url.searchParams.get("id"), `eq.${comment.id}`);
    assert.equal(url.searchParams.get("updated_at"), `eq.${comment.updated_at}`);
    assert.deepEqual(JSON.parse(String(init?.body)), { body: "EDITED" });
    return json([{ ...comment, body: "EDITED" }]);
  }));
});

test("RLS-denied or stale updates/deletes returning zero rows are never success", async () => {
  const denied = client(() => json([]));
  for (const action of [() => updatePost(post, draft, reference, denied), () => updateComment(comment, "EDITED", denied), () => deletePost(post, denied), () => deleteComment(comment, denied)]) {
    await assert.rejects(action(), { code: "unchanged" });
  }
});

test("both delete functions filter ID and version and request no private columns", async () => {
  for (const [record, remove] of [[post, deletePost], [comment, deleteComment]] as const) {
    await remove(record, client((url, init) => {
      assert.equal(init?.method, "DELETE"); assert.equal(url.searchParams.get("id"), `eq.${record.id}`);
      assert.equal(url.searchParams.get("updated_at"), `eq.${record.updated_at}`);
      assert.equal(url.searchParams.get("select"), "id"); return json([{ id: record.id }]);
    }));
  }
});

test("community error messages distinguish rate limit, permissions and deleted parent", async () => {
  for (const [error, expected] of [[{ code: "P0001", message: "Write rate limit exceeded" }, "limit"], [{ code: "42501" }, "permission"], [{ code: "23503" }, "reference"], [{ code: "23514" }, "validation"]] as const) {
    await assert.rejects(createComment(post.id, "TEST_ONLY", client(() => json(error, 400))), { code: expected });
  }
  await assert.rejects(createComment(post.id, "TEST_ONLY", client(() => json({ message: "PRIVATE_TOKEN_TEST" }, 500))), error => !String(error).includes("PRIVATE_TOKEN_TEST"));
});

test("all community mutations disable automatic retry even on 503", async () => {
  let requests = 0;
  const unavailable = client(() => { requests++; return json({ code: "unavailable" }, 503); });
  const actions = [() => createPost(draft, reference, unavailable), () => updatePost(post, draft, reference, unavailable), () => deletePost(post, unavailable), () => createComment(post.id, "TEST_ONLY", unavailable), () => updateComment(comment, "EDITED", unavailable), () => deleteComment(comment, unavailable)];
  for (const action of actions) await assert.rejects(action(), { code: "write" });
  assert.equal(requests, 6);
});

test("ownership without a session does not sign up or call an API", async () => {
  assert.deepEqual(await loadMyCommunityIds(client(() => { assert.fail("No API call without session"); })), { posts: [], comments: [] });
});

test("ownership RPC separates posts/comments and does not expose IDs of other kinds", async () => {
  const c = client(url => {
    assert.ok(url.pathname.endsWith("/rpc/my_content_ids"));
    return json([{ kind: "posts", id: post.id }, { kind: "comments", id: comment.id }, { kind: "seat_shares", id: "not-community" }]);
  });
  c.auth.getSession = async () => ({ data: { session: { user: { is_anonymous: true } } }, error: null }) as Awaited<ReturnType<typeof c.auth.getSession>>;
  assert.deepEqual(await loadMyCommunityIds(c), { posts: [post.id], comments: [comment.id] });
});


test("Line 2 community create/update allows its 51 stations and rejects cross-line Gangnam", async () => {
  const line2: ShareReference = { lineKey: "line2", lineId: "test-line2", lineName: "2호선", stations: SHARE_LINES[1].stations.map((s, i) => ({ membershipId: `l2-member-${i}`, stationId: `l2-station-${i}`, name: s.name, source: "https://example.invalid", sourceCode: s.sourceCode })) };
  const gangnam = line2.stations.find(s => s.sourceCode === "02호선:0222")!;
  const payload = { ...draft, line_id: line2.lineId, line_station_id: gangnam.membershipId };
  assert.equal(validatePost(payload, line2).line_station_id, gangnam.membershipId);
  assert.equal(validatePost({ ...payload, line_station_id: null }, line2).line_station_id, null);
  assert.throws(() => validatePost({ ...payload, line_station_id: reference.stations[3].membershipId }, line2), { code: "validation" });
  assert.throws(() => validatePost(payload, { ...line2, stations: line2.stations.slice(0, 50) }), { code: "validation" });
  for (const station of line2.stations) assert.doesNotThrow(() => validatePost({ ...payload, line_station_id: station.membershipId }, line2));
  const c = client((url, init) => {
    assert.deepEqual(JSON.parse(String(init?.body)), payload);
    assert.doesNotMatch(url.searchParams.get("select")!, /owner_id/);
    return json(init?.method === "POST" ? { ...post, ...payload } : [{ ...post, ...payload }], init?.method === "POST" ? 201 : 200);
  });
  assert.equal((await createPost(payload, line2, c)).line_id, line2.lineId);
  assert.equal((await updatePost(post, payload, line2, c)).line_station_id, gangnam.membershipId);
});
