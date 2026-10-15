import { jsonOk, withAdmin } from "@/lib/api/server";
import { requestOrderEmailResend } from "@/lib/services/admin-data";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  return withAdmin(
    async ({ db, session }) => jsonOk(await requestOrderEmailResend(db, session, orderId)),
    request,
  );
}
