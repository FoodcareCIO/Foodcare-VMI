import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabasePublishableKey, getSupabaseUrl } from "./env";

/**
 * Cookie-bound Supabase client for Server Components, Server Actions, and
 * Route Handlers. Uses the publishable key and the logged-in user's session,
 * so it is subject to RLS. Use this to read the current session / identity.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component where cookies are read-only.
          // The proxy refreshes/writes the session cookie on every request.
        }
      },
    },
  });
}
