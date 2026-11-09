import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database";
import { readPublicConfig } from "./config";

let publicClient: SupabaseClient<Database> | undefined;
let authorClient: SupabaseClient<Database> | undefined;

export function getPublicClient() {
  if (!publicClient) {
    const { url, key } = readPublicConfig();
    publicClient = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  // Never loads an author's session: reading does not sign in or create a user.
  return publicClient;
}

export function getAuthorClient() {
  if (typeof window === "undefined") throw new Error("Author sessions require a browser.");
  if (!authorClient) {
    const { url, key } = readPublicConfig();
    authorClient = createClient<Database>(url, key, {
      auth: {
        storageKey: "subwayeasy-anonymous-author",
        persistSession: true, autoRefreshToken: true, detectSessionInUrl: false,
      },
    });
  }
  return authorClient;
}
