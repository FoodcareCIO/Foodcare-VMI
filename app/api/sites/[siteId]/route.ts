import { jsonOk, parseJson, withAdmin } from "@/lib/api/server";
import {
  getOrderEmailSettings,
  getSite,
  listProductOptions,
  updateSiteOrderRecipients,
} from "@/lib/services/admin-data";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const { siteId } = await params;
  return withAdmin(async ({ db }) => {
    const [site, products, orderEmail] = await Promise.all([
      getSite(db, siteId),
      listProductOptions(db),
      getOrderEmailSettings(db),
    ]);
    return jsonOk({
      site,
      products: products.products,
      orderEmail,
    });
  }, request);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const { siteId } = await params;
  return withAdmin(async ({ db, request: req }) => {
    const body = await parseJson<Record<string, unknown>>(req);
    return jsonOk(await updateSiteOrderRecipients(db, siteId, body));
  }, request);
}
