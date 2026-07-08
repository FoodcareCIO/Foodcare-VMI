import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getAdminSession, type AdminSession } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function withAdmin(
  handler: (ctx: {
    db: SupabaseClient;
    session: AdminSession;
    request: Request;
  }) => Promise<NextResponse>,
  request: Request,
): Promise<NextResponse> {
  const session = await getAdminSession();
  if (!session) return jsonError("Unauthorized", 401);

  const db = createSupabaseAdminClient();
  try {
    return await handler({ db, session, request });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return jsonError(message, 400);
  }
}

export async function parseJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

export const nowIso = () => new Date().toISOString();
