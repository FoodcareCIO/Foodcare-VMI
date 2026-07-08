import { jsonOk, parseJson, withAdmin } from "@/lib/api/server";
import { parsePagination, parseSearch, parseSort } from "@/lib/pagination";
import {
  REP_DEFAULT_SORT,
  repSortColumns,
} from "@/lib/sort-config";
import {
  createRep,
  deleteRep,
  listReps,
  updateRep,
} from "@/lib/services/admin-data";

export async function GET(request: Request) {
  return withAdmin(async ({ db, request: req }) => {
    const pagination = parsePagination(req);
    const sort = parseSort(req, {
      columns: repSortColumns,
      defaultColumn: REP_DEFAULT_SORT,
    });
    return jsonOk(await listReps(db, pagination, sort, parseSearch(req)));
  }, request);
}

export async function POST(request: Request) {
  return withAdmin(async ({ db, request: req }) => {
    const body = await parseJson<Record<string, unknown>>(req);
    return jsonOk(await createRep(db, body));
  }, request);
}

export async function PATCH(request: Request) {
  return withAdmin(async ({ db, request: req }) => {
    const body = await parseJson<Record<string, unknown> & { id?: string }>(req);
    if (!body.id) throw new Error("Missing id.");
    const { id, ...patch } = body;
    return jsonOk(await updateRep(db, id, patch));
  }, request);
}

export async function DELETE(request: Request) {
  return withAdmin(async ({ db, request: req }) => {
    const body = await parseJson<{ id?: string; restore?: boolean }>(req);
    if (!body.id) throw new Error("Missing id.");
    return jsonOk(await deleteRep(db, body.id, Boolean(body.restore)));
  }, request);
}
