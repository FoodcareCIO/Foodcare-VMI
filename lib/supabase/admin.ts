import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseSecretKey, getSupabaseUrl } from "./env";

/**
 * Service-role Supabase client. Bypasses RLS, so it must ONLY be used in
 * server code AFTER `requireAdmin()` has authorized the caller.
 *
 * The `server-only` import guarantees this module can never be bundled into
 * client-side code.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  return createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
