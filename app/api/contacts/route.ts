import { jsonOk, parseJson, withAdmin } from "@/lib/api/server";
import { parsePagination, parseSearch, parseSort } from "@/lib/pagination";
import {
  CONTACT_DEFAULT_SORT,
  contactSortColumns,
} from "@/lib/sort-config";
import {
  createContact,
  deleteContact,
  listContacts,
  updateContact,
} from "@/lib/services/admin-data";

export async function GET(request: Request) {
  return withAdmin(async ({ db, request: req }) => {
    const customerId = new URL(req.url).searchParams.get("customer_id");
    if (!customerId) throw new Error("customer_id is required.");
    const pagination = parsePagination(req);
    const sort = parseSort(req, {
      columns: contactSortColumns,
      defaultColumn: CONTACT_DEFAULT_SORT,
    });
    return jsonOk(await listContacts(db, customerId, pagination, sort, parseSearch(req)));
  }, request);
}

export async function POST(request: Request) {
  return withAdmin(async ({ db, request: req }) => {
    const body = await parseJson<Record<string, unknown>>(req);
    return jsonOk(await createContact(db, body));
  }, request);
}

export async function PATCH(request: Request) {
  return withAdmin(async ({ db, request: req }) => {
    const body = await parseJson<Record<string, unknown> & { id?: string }>(req);
    if (!body.id) throw new Error("Missing id.");
    const { id, ...patch } = body;
    return jsonOk(await updateContact(db, id, patch));
  }, request);
}

export async function DELETE(request: Request) {
  return withAdmin(async ({ db, request: req }) => {
    const body = await parseJson<{ id?: string; restore?: boolean }>(req);
    if (!body.id) throw new Error("Missing id.");
    return jsonOk(await deleteContact(db, body.id, Boolean(body.restore)));
  }, request);
}
