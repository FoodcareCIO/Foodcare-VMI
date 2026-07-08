import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "./supabase/server";

export interface AdminSession {
  userId: string;
  email: string;
  role: string;
}

/**
 * Returns the current admin session, or null if the visitor is not signed in
 * or is signed in but not a member of `admin_users`.
 *
 * Identity is verified with getClaims() (validates the JWT signature); admin
 * membership is read through the RLS-scoped server client (the
 * `admin_users_self_select` policy lets a user read their own row).
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;

  const claims = data.claims as { sub?: string; email?: string };
  if (!claims.sub) return null;

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("user_id, role")
    .eq("user_id", claims.sub)
    .is("deleted_at", null)
    .maybeSingle();

  if (!adminRow) return null;

  return {
    userId: claims.sub,
    email: claims.email ?? "",
    role: adminRow.role as string,
  };
}

/**
 * Guard for every dashboard page and server action. Redirects to /login when
 * the caller is not an authorized admin.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return session;
}
