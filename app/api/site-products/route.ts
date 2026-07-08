import { jsonOk, parseJson, withAdmin } from "@/lib/api/server";
import { parsePagination, parseSearch, parseSort } from "@/lib/pagination";
import {
  SITE_PRODUCT_DEFAULT_SORT,
  siteProductSortColumns,
} from "@/lib/sort-config";
import {
  createSiteProduct,
  deleteSiteProduct,
  listSiteProducts,
  updateSiteProduct,
} from "@/lib/services/admin-data";

export async function GET(request: Request) {
  return withAdmin(async ({ db, request: req }) => {
    const siteId = new URL(req.url).searchParams.get("site_id");
    if (!siteId) throw new Error("site_id is required.");
    const pagination = parsePagination(req);
    const sort = parseSort(req, {
      columns: siteProductSortColumns,
      defaultColumn: SITE_PRODUCT_DEFAULT_SORT,
    });
    return jsonOk(await listSiteProducts(db, siteId, pagination, sort, parseSearch(req)));
  }, request);
}

export async function POST(request: Request) {
  return withAdmin(async ({ db, request: req }) => {
    const body = await parseJson<Record<string, unknown>>(req);
    return jsonOk(await createSiteProduct(db, body));
  }, request);
}

export async function PATCH(request: Request) {
  return withAdmin(async ({ db, request: req }) => {
    const body = await parseJson<Record<string, unknown> & { id?: string }>(req);
    if (!body.id) throw new Error("Missing id.");
    const { id, ...patch } = body;
    return jsonOk(await updateSiteProduct(db, id, patch));
  }, request);
}

export async function DELETE(request: Request) {
  return withAdmin(async ({ db, request: req }) => {
    const body = await parseJson<{ id?: string; restore?: boolean }>(req);
    if (!body.id) throw new Error("Missing id.");
    return jsonOk(await deleteSiteProduct(db, body.id, Boolean(body.restore)));
  }, request);
}
