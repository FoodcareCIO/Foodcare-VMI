import { jsonOk, parseJson, withAdmin } from "@/lib/api/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation";

export async function POST(request: Request) {
  return withAdmin(async ({ session, request: req }) => {
    const body = await parseJson<{
      currentPassword?: string;
      newPassword?: string;
    }>(req);

    const currentPassword = String(body.currentPassword ?? "");
    const newPassword = String(body.newPassword ?? "");

    if (!currentPassword) throw new Error("Current password is required.");
    if (!newPassword) throw new Error("New password is required.");
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    }
    if (newPassword === currentPassword) {
      throw new Error("New password must be different from your current password.");
    }
    if (!session.email) throw new Error("Could not verify your account email.");

    const supabase = await createSupabaseServerClient();

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: session.email,
      password: currentPassword,
    });
    if (verifyError) throw new Error("Current password is incorrect.");

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (updateError) throw new Error(updateError.message);

    return jsonOk({ ok: true });
  }, request);
}
