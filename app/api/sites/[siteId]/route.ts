import { jsonOk, withAdmin } from "@/lib/api/server";
import { getSite, listProductOptions } from "@/lib/services/admin-data";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const { siteId } = await params;
  return withAdmin(async ({ db }) => {
    const [site, products] = await Promise.all([
      getSite(db, siteId),
      listProductOptions(db),
    ]);
    return jsonOk({
      site,
      products: products.products,
    });
  }, request);
}
