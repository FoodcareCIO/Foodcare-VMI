import { jsonOk, withAdmin } from "@/lib/api/server";
import { getOrderExportUrl } from "@/lib/services/admin-data";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  return withAdmin(
    async ({ db }) => jsonOk(await getOrderExportUrl(db, orderId)),
    request,
  );
}
