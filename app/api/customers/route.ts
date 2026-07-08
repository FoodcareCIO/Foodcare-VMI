import { jsonOk, parseJson, withAdmin } from "@/lib/api/server";
import { parsePagination, parseSearch, parseSort } from "@/lib/pagination";
import {
  CUSTOMER_DEFAULT_SORT,
  customerSortColumns,
} from "@/lib/sort-config";
import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer,
} from "@/lib/services/admin-data";

export async function GET(request: Request) {
  return withAdmin(async ({ db, request: req }) => {
    const pagination = parsePagination(req);
    const sort = parseSort(req, {
      columns: customerSortColumns,
      defaultColumn: CUSTOMER_DEFAULT_SORT,
    });
    const search = parseSearch(req);
    return jsonOk(await listCustomers(db, pagination, sort, search));
  }, request);
}

export async function POST(request: Request) {
  return withAdmin(async ({ db, request: req }) => {
    const body = await parseJson<Record<string, unknown>>(req);
    return jsonOk(await createCustomer(db, body));
  }, request);
}

export async function PATCH(request: Request) {
  return withAdmin(async ({ db, request: req }) => {
    const body = await parseJson<Record<string, unknown> & { id?: string }>(req);
    if (!body.id) throw new Error("Missing id.");
    const { id, ...patch } = body;
    return jsonOk(await updateCustomer(db, id, patch));
  }, request);
}

export async function DELETE(request: Request) {
  return withAdmin(async ({ db, request: req }) => {
    const body = await parseJson<{ id?: string; restore?: boolean }>(req);
    if (!body.id) throw new Error("Missing id.");
    return jsonOk(await deleteCustomer(db, body.id, Boolean(body.restore)));
  }, request);
}
