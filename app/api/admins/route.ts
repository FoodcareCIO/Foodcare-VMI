import { jsonOk, parseJson, withAdmin } from "@/lib/api/server";
import { parsePagination, parseSearch, parseSort } from "@/lib/pagination";
import {
  ADMIN_DEFAULT_SORT,
  adminSortColumns,
} from "@/lib/sort-config";
import {
  createAdmin,
  deleteAdmin,
  listAdmins,
  updateAdmin,
} from "@/lib/services/admin-data";

export async function GET(request: Request) {
  return withAdmin(async ({ db, request: req }) => {
    const pagination = parsePagination(req);
    const sort = parseSort(req, {
      columns: adminSortColumns,
      defaultColumn: ADMIN_DEFAULT_SORT,
    });
    return jsonOk(await listAdmins(db, pagination, sort, parseSearch(req)));
  }, request);
}

export async function POST(request: Request) {
  return withAdmin(async ({ db, request: req }) => {
    const body = await parseJson<Record<string, unknown>>(req);
    return jsonOk(await createAdmin(db, body));
  }, request);
}

export async function PATCH(request: Request) {
  return withAdmin(async ({ db, request: req }) => {
    const body = await parseJson<Record<string, unknown> & { user_id?: string }>(
      req,
    );
    if (!body.user_id) throw new Error("Missing user_id.");
    const { user_id, ...patch } = body;
    return jsonOk(await updateAdmin(db, user_id, patch));
  }, request);
}

export async function DELETE(request: Request) {
  return withAdmin(async ({ db, session, request: req }) => {
    const body = await parseJson<{ user_id?: string; restore?: boolean }>(req);
    if (!body.user_id) throw new Error("Missing user_id.");
    return jsonOk(
      await deleteAdmin(db, session, body.user_id, Boolean(body.restore)),
    );
  }, request);
}
