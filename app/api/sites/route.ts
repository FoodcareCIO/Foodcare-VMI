import { jsonOk, parseJson, withAdmin } from "@/lib/api/server";
import { parsePagination, parseSearch, parseSort } from "@/lib/pagination";
import {
  SITE_DEFAULT_SORT,
  siteSortColumns,
} from "@/lib/sort-config";
import {
  createSite,
  deleteSite,
  listSites,
  updateSite,
} from "@/lib/services/admin-data";

export async function GET(request: Request) {
  return withAdmin(async ({ db, request: req }) => {
    const customerId = new URL(req.url).searchParams.get("customer_id");
    if (!customerId) throw new Error("customer_id is required.");
    const pagination = parsePagination(req);
    const sort = parseSort(req, {
      columns: siteSortColumns,
      defaultColumn: SITE_DEFAULT_SORT,
    });
    return jsonOk(await listSites(db, customerId, pagination, sort, parseSearch(req)));
  }, request);
}

export async function POST(request: Request) {
  return withAdmin(async ({ db, request: req }) => {
    const body = await parseJson<Record<string, unknown>>(req);
    return jsonOk(await createSite(db, body));
  }, request);
}

export async function PATCH(request: Request) {
  return withAdmin(async ({ db, request: req }) => {
    const body = await parseJson<Record<string, unknown> & { id?: string }>(req);
    if (!body.id) throw new Error("Missing id.");
    const { id, ...patch } = body;
    return jsonOk(await updateSite(db, id, patch));
  }, request);
}

export async function DELETE(request: Request) {
  return withAdmin(async ({ db, request: req }) => {
    const body = await parseJson<{ id?: string; restore?: boolean }>(req);
    if (!body.id) throw new Error("Missing id.");
    return jsonOk(await deleteSite(db, body.id, Boolean(body.restore)));
  }, request);
}
