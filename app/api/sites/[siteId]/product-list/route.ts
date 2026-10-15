import { jsonOk, withAdmin } from "@/lib/api/server";
import { PRODUCT_IMPORT_MAX_FILE_SIZE } from "@/lib/product-sheet";
import {
  getSiteProductList,
  previewSiteProductList,
  replaceSiteProductList,
} from "@/lib/services/site-product-list";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const { siteId } = await params;
  return withAdmin(async ({ db }) => jsonOk(await getSiteProductList(db, siteId)), request);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ siteId: string }> },
) {
  const { siteId } = await params;
  return withAdmin(async ({ db, session, request: req }) => {
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > PRODUCT_IMPORT_MAX_FILE_SIZE + 100_000) {
      throw new Error("The upload is larger than 5 MB.");
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const mode = formData.get("mode");
    if (!(file instanceof File)) throw new Error("Choose a spreadsheet to upload.");
    if (mode === "preview") return jsonOk(await previewSiteProductList(db, siteId, file));
    if (mode !== "replace") throw new Error("Invalid upload mode.");

    const expectedVersion = formData.get("expectedVersion");
    if (typeof expectedVersion !== "string" || !/^\d+$/.test(expectedVersion)) {
      throw new Error("Preview the file before replacing the site list.");
    }
    return jsonOk(
      await replaceSiteProductList(db, session.userId, siteId, file, {
        expectedVersion: Number(expectedVersion),
        confirmSiteMismatch: formData.get("confirmSiteMismatch") === "true",
        confirmLargeRemoval: formData.get("confirmLargeRemoval") === "true",
      }),
    );
  }, request);
}
