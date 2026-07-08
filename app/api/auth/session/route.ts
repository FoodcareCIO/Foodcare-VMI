import { NextResponse } from "next/server";

import { jsonOk, withAdmin } from "@/lib/api/server";
import { getAdminSession } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return jsonOk(session);
}

export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return jsonOk({ ok: true });
}
