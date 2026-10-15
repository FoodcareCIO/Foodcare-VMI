import { jsonOk, parseJson, withAdmin } from "@/lib/api/server";
import { getOrderEmailSettings, updateOrderEmailSettings } from "@/lib/services/admin-data";

export async function GET(request: Request) {
  return withAdmin(async ({ db }) => jsonOk(await getOrderEmailSettings(db)), request);
}

export async function PUT(request: Request) {
  return withAdmin(async ({ db, session, request: req }) => {
    const body = await parseJson<Record<string, unknown>>(req);
    return jsonOk(await updateOrderEmailSettings(db, session, body));
  }, request);
}
