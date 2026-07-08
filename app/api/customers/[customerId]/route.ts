import { jsonOk, withAdmin } from "@/lib/api/server";
import { getCustomer } from "@/lib/services/admin-data";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> },
) {
  const { customerId } = await params;
  return withAdmin(async ({ db }) => {
    return jsonOk({ customer: await getCustomer(db, customerId) });
  }, request);
}
