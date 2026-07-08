import { jsonOk, withAdmin } from "@/lib/api/server";
import { getOrder } from "@/lib/services/admin-data";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  return withAdmin(
    async ({ db }) => jsonOk({ order: await getOrder(db, orderId) }),
    request,
  );
}
