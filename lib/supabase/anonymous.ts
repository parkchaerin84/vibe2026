import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getAuthorClient } from "./client";
import { ConnectionError } from "./config";
import { authFailure } from "./auth-errors";

type AuthorAuth = Pick<SupabaseClient["auth"], "getSession" | "getUser" | "signInAnonymously">;

/** Call only from a user-initiated write flow. Never on page load. */
export function createAnonymousAuthorGate(auth: AuthorAuth) {
  let pending: Promise<User> | undefined;
  async function prepare(captchaToken?: string): Promise<User> {
    const existing = await auth.getSession();
    if (existing.error) throw authFailure(existing.error, "session");
    if (existing.data.session) {
      // Validate the existing identity with Auth instead of trusting localStorage.
      const result = await auth.getUser();
      if (result.error || !result.data.user) {
        // Do not silently create a replacement ID and lose ownership of old content.
        throw authFailure(result.error ?? {}, "verify_user");
      }
      if (!result.data.user.is_anonymous) throw new ConnectionError("identity", "이 기능은 익명 작성자 세션을 사용합니다.");
      return result.data.user;
    }
    const result = await auth.signInAnonymously({ options: captchaToken ? { captchaToken } : {} });
    if (result.error) {
      throw authFailure(result.error, "anonymous_signup");
    }
    if (!result.data.session || !result.data.user?.is_anonymous) {
      throw new ConnectionError("auth", "유효한 익명 작성자 세션을 받지 못했습니다.");
    }
    return result.data.user;
  }
  return (options: { captchaToken?: string } = {}) => {
    // Deduplicate double clicks in this tab; failures are never retried automatically.
    if (!pending) pending = prepare(options.captchaToken).finally(() => { pending = undefined; });
    return pending;
  };
}

let gate: ReturnType<typeof createAnonymousAuthorGate> | undefined;
export function ensureAnonymousAuthor(options: { captchaToken?: string } = {}) {
  gate ??= createAnonymousAuthorGate(getAuthorClient().auth);
  return gate(options);
}
