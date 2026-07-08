import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublishableKey, getSupabaseUrl } from "./env";

/**
 * Browser Supabase client (singleton under the hood). Used from Client
 * Components for sign-in / sign-out only.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabasePublishableKey());
}
