import { jsonOk, withAdmin } from "@/lib/api/server";
import {
  importProducts,
  previewProductImport,
  PRODUCT_IMPORT_MAX_FILE_SIZE,
} from "@/lib/services/product-import";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withAdmin(async ({ db, request: req }) => {
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > PRODUCT_IMPORT_MAX_FILE_SIZE + 100_000) {
      throw new Error("The upload is larger than 5 MB.");
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const mode = formData.get("mode");
    if (!(file instanceof File)) throw new Error("Choose a spreadsheet to upload.");
    if (mode !== "preview" && mode !== "import") throw new Error("Invalid import mode.");

    return jsonOk(
      mode === "preview"
        ? await previewProductImport(db, file)
        : await importProducts(db, file),
    );
  }, request);
}
