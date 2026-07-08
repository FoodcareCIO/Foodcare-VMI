import { jsonOk, withAdmin } from "@/lib/api/server";
import { getOverview } from "@/lib/services/admin-data";

export async function GET(request: Request) {
  return withAdmin(async ({ db }) => jsonOk(await getOverview(db)), request);
}
