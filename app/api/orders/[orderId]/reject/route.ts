import { jsonOk, parseJson, withAdmin } from "@/lib/api/server";
import { rejectOrder } from "@/lib/services/admin-data";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  return withAdmin(async ({ db, request: req }) => {
    const body = await parseJson<{ reason?: string }>(req);
    return jsonOk(await rejectOrder(db, orderId, body.reason ?? ""));
  }, request);
}
