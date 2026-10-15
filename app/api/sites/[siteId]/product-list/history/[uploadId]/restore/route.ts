import { jsonOk, withAdmin } from "@/lib/api/server";
import { restoreSiteProductList } from "@/lib/services/site-product-list";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ siteId: string; uploadId: string }> },
) {
  const { siteId, uploadId } = await params;
  return withAdmin(
    async ({ db, session }) =>
      jsonOk(await restoreSiteProductList(db, session.userId, siteId, uploadId)),
    request,
  );
}
