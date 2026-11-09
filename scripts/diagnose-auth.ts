import { loadEnvConfig } from "@next/env";
import { readPublicConfig } from "../lib/supabase/config";
import { authFailure } from "../lib/supabase/auth-errors";

async function main() {
  loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
  const { url, key } = readPublicConfig();
  const settings = await fetch(`${url}/auth/v1/settings`, {
    headers: { apikey: key }, signal: AbortSignal.timeout(15000),
  });
  const data = await settings.json();
  // Allowlist only public diagnostic fields. Never print response bodies or headers.
  console.log(JSON.stringify({
    settingsHttp: settings.status,
    anonymousEnabled: data.external?.anonymous ?? null,
    anonymousUsersEnabled: data.anonymous_users_enabled ?? null,
    signupDisabled: data.disable_signup ?? null,
    captchaWidgetConfigured: !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    previousTokyoProject: new URL(url).hostname === "goadyivlpedkphlqsvbl.supabase.co",
    projectRef: new URL(url).hostname.split(".")[0],
  }));
  // Default is read-only; creating an Auth user requires an explicit flag.
  if (!process.argv.includes("--attempt-signup")) return;
  if (!settings.ok) return;
  // Exactly one anonymous signup attempt. May create one test Auth user if enabled.
  const result = await fetch(`${url}/auth/v1/signup`, {
    method: "POST", headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ data: {} }), signal: AbortSignal.timeout(15000),
  });
  const payload = await result.json();
  if (result.ok) {
    console.log(JSON.stringify({ signupHttp: result.status, anonymous: payload.user?.is_anonymous ?? payload.is_anonymous ?? null, sessionReturned: !!payload.access_token }));
  } else {
    // Standard provider messages only; do not emit arbitrary raw server text.
    const message = payload.msg ?? payload.message ?? payload.error_description;
    console.log(authFailure({ code: payload.error_code ?? payload.code, status: result.status, message }, "anonymous_signup").message);
  }
}
void main().catch(() => { console.log("Auth diagnostic failed (details withheld)"); process.exitCode = 1; });
