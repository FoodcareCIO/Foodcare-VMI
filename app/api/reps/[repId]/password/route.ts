import { createClient } from "@supabase/supabase-js";

import { jsonOk, parseJson, withAdmin } from "@/lib/api/server";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ repId: string }> },
) {
  const { repId } = await params;

  return withAdmin(async ({ db, request: req }) => {
    const body = await parseJson<{
      oldPassword?: string;
      newPassword?: string;
    }>(req);

    const oldPassword = String(body.oldPassword ?? "");
    const newPassword = String(body.newPassword ?? "");

    if (!oldPassword) throw new Error("Old password is required.");
    if (!newPassword) throw new Error("New password is required.");
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new Error(
        `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      );
    }
    if (newPassword === oldPassword) {
      throw new Error("New password must be different from the old password.");
    }

    const { data: rep, error: repError } = await db
      .from("sales_reps")
      .select("user_id")
      .eq("id", repId)
      .is("deleted_at", null)
      .maybeSingle();
    if (repError) throw new Error(repError.message);
    if (!rep) throw new Error("Rep not found.");

    const { data: userData, error: userError } =
      await db.auth.admin.getUserById(rep.user_id);
    const email = userData.user?.email;
    if (userError || !email) throw new Error("Could not verify the rep account.");

    const verificationClient = createClient(
      getSupabaseUrl(),
      getSupabasePublishableKey(),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
    const { data: verification, error: verificationError } =
      await verificationClient.auth.signInWithPassword({
        email,
        password: oldPassword,
      });

    if (verificationError || verification.user.id !== rep.user_id) {
      throw new Error("Old password is incorrect.");
    }

    const { error: updateError } = await db.auth.admin.updateUserById(
      rep.user_id,
      { password: newPassword },
    );
    if (updateError) throw new Error(updateError.message);

    return jsonOk({ ok: true });
  }, request);
}
