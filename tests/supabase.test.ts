import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { createAnonymousAuthorGate } from "../lib/supabase/anonymous";
import { readPublicConfig } from "../lib/supabase/config";
import { loadShinbundangStations } from "../lib/supabase/shinbundang";
import type { Database } from "../lib/supabase/database";
import { authFailure } from "../lib/supabase/auth-errors";

type Auth = Parameters<typeof createAnonymousAuthorGate>[0];
const author = { id: "test-only-author", is_anonymous: true };
function fakeAuth(overrides: Record<string, unknown> = {}) {
  let signups = 0;
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: author }, error: null }),
      signInAnonymously: async () => { signups++; return { data: { user: author, session: { user: author } }, error: null }; },
      ...overrides,
    } as unknown as Auth,
    count: () => signups,
  };
}

test("double clicks create only one anonymous session", async () => {
  const fake = fakeAuth();
  const gate = createAnonymousAuthorGate(fake.auth);
  const [a, b] = await Promise.all([gate(), gate()]);
  assert.equal(fake.count(), 1); assert.equal(a.id, b.id);
});
test("existing valid anonymous identity is reused without a signup", async () => {
  const fake = fakeAuth({ getSession: async () => ({ data: { session: {} }, error: null }) });
  assert.equal((await createAnonymousAuthorGate(fake.auth)()).id, author.id);
  assert.equal(fake.count(), 0);
});
test("failed existing identity validation does not replace its UID", async () => {
  const fake = fakeAuth({
    getSession: async () => ({ data: { session: {} }, error: null }),
    getUser: async () => ({ data: { user: null }, error: { message: "test-only" } }),
  });
  await assert.rejects(createAnonymousAuthorGate(fake.auth)(), { code: "session" });
  assert.equal(fake.count(), 0);
});
test("permanent user is not silently accepted by anonymous-only policies", async () => {
  const fake = fakeAuth({
    getSession: async () => ({ data: { session: {} }, error: null }),
    getUser: async () => ({ data: { user: { ...author, is_anonymous: false } }, error: null }),
  });
  await assert.rejects(createAnonymousAuthorGate(fake.auth)(), { code: "identity" });
  assert.equal(fake.count(), 0);
});
test("CAPTCHA token forwarded; auth failure is not automatically retried", async () => {
  let attempts = 0;
  const fake = fakeAuth({ signInAnonymously: async (options: unknown) => {
    attempts++; assert.deepEqual(options, { options: { captchaToken: "test-token" } });
    return { data: {}, error: { code: "captcha_failed", status: 400 } };
  } });
  await assert.rejects(createAnonymousAuthorGate(fake.auth)({ captchaToken: "test-token" }), { code: "captcha" });
  assert.equal(attempts, 1);
});
test("configuration rejects secret keys and the previous Tokyo endpoint", () => {
  const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const oldKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://testproject.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_secret_TEST_ONLY";
    assert.throws(readPublicConfig, { code: "configuration" });
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_TEST_ONLY";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://testproject.supabase.co/rest/v1/";
    assert.equal(readPublicConfig().url, "https://testproject.supabase.co");
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://goadyivlpedkphlqsvbl.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_TEST_ONLY";
    assert.throws(readPublicConfig, { code: "configuration" });
  } finally {
    if (oldUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = oldKey;
  }
});

function referenceClient(mode: "ready" | "empty" | "error" | "partial") {
  const paths: string[] = [];
  const client = createClient<Database>("https://testproject.supabase.co", "sb_publishable_TEST_ONLY", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input) => {
      const path = new URL(String(input)).pathname;
      paths.push(path);
      assert.ok(path.startsWith("/rest/v1/"), "public read must never request an Auth endpoint");
      if (mode === "error") return new Response(JSON.stringify({ message: "TEST_ONLY_ERROR" }), { status: 403 });
      if (path.endsWith("/lines")) return new Response(JSON.stringify(mode === "empty" ? [] : [{ id: "line-test", name: "신분당선" }]), { headers: { "Content-Type": "application/json" } });
      const members = Array.from({ length: mode === "partial" ? 15 : 16 }, (_, i) => {
        const code = `I11D1:D${String(i + 4).padStart(3, "0")}`;
        return { id: `membership-${i}`, line_id: "line-test", station_id: `station-${i}`, source_code: code,
          stations: { id: `station-${i}`, name: "TEST_ONLY_STATION", source_code: code, source_dataset: "kric_urban_rail_station", source: "https://example.invalid" } };
      });
      return new Response(JSON.stringify(members), { headers: { "Content-Type": "application/json" } });
    } },
  });
  return { client, paths };
}
test("public reads load all 16 source memberships without calling Auth", async () => {
  const fake = referenceClient("ready");
  assert.equal((await loadShinbundangStations(undefined, fake.client))?.stations.length, 16);
  assert.equal(fake.paths.length, 2);
});
test("empty public data is different from a permission error", async () => {
  assert.equal(await loadShinbundangStations(undefined, referenceClient("empty").client), null);
  await assert.rejects(loadShinbundangStations(undefined, referenceClient("error").client), { code: "read" });
});
test("partial real data is not padded with example stations", async () => {
  await assert.rejects(loadShinbundangStations(undefined, referenceClient("partial").client), { code: "incomplete" });
});

test("disabled provider, CAPTCHA, signup block and rate limit stay distinct", () => {
  const disabled = authFailure({ code: "anonymous_provider_disabled", status: 422, message: "Anonymous sign-ins are disabled" }, "anonymous_signup");
  assert.equal(disabled.code, "anonymous_disabled");
  assert.match(disabled.message, /HTTP: 422/);
  assert.match(disabled.message, /오류 코드: anonymous_provider_disabled/);
  assert.match(disabled.message, /Anonymous sign-ins are disabled/);
  assert.equal(authFailure({ code: "captcha_failed", status: 422 }, "anonymous_signup").code, "captcha");
  assert.equal(authFailure({ code: "signup_disabled", status: 422 }, "anonymous_signup").code, "signup_disabled");
  assert.equal(authFailure({ code: "over_request_rate_limit", status: 429 }, "anonymous_signup").code, "rate_limit");
  assert.doesNotMatch(authFailure({ code: "unexpected_failure", status: 500 }, "anonymous_signup").message, /익명 가입을 비활성/);
});
test("auth error diagnostics never echo arbitrary server secrets", () => {
  const failure = authFailure({ code: "sb_secret_FAKE", status: 500, message: "Bearer TEST_TOKEN sb_secret_FAKE refresh_token=TEST" }, "anonymous_signup");
  assert.doesNotMatch(failure.message, /TEST_TOKEN|sb_secret_FAKE|refresh_token/);
  assert.doesNotMatch(authFailure({ code: "sb_secret_fake", message: "private" }, "anonymous_signup").message, /sb_secret_fake|private/);
});
