import { jsonOk, withAdmin } from "@/lib/api/server";
import { listSiteProductListHistory } from "@/lib/services/site-product-list";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const { siteId } = await params;
  return withAdmin(
    async ({ db }) => jsonOk({ uploads: await listSiteProductListHistory(db, siteId) }),
    request,
  );
}
