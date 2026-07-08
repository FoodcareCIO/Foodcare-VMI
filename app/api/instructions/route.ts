import { jsonOk, parseJson, withAdmin } from "@/lib/api/server";
import { parsePagination, parseSearch, parseSort } from "@/lib/pagination";
import {
  INSTRUCTION_DEFAULT_SORT,
  instructionSortColumns,
} from "@/lib/sort-config";
import {
  createInstruction,
  deleteInstruction,
  listInstructions,
  updateInstruction,
} from "@/lib/services/admin-data";

export async function GET(request: Request) {
  return withAdmin(async ({ db, request: req }) => {
    const siteId = new URL(req.url).searchParams.get("site_id");
    if (!siteId) throw new Error("site_id is required.");
    const pagination = parsePagination(req);
    const sort = parseSort(req, {
      columns: instructionSortColumns,
      defaultColumn: INSTRUCTION_DEFAULT_SORT,
    });
    return jsonOk(await listInstructions(db, siteId, pagination, sort, parseSearch(req)));
  }, request);
}

export async function POST(request: Request) {
  return withAdmin(async ({ db, request: req }) => {
    const body = await parseJson<Record<string, unknown>>(req);
    return jsonOk(await createInstruction(db, body));
  }, request);
}

export async function PATCH(request: Request) {
  return withAdmin(async ({ db, request: req }) => {
    const body = await parseJson<Record<string, unknown> & { id?: string }>(req);
    if (!body.id) throw new Error("Missing id.");
    const { id, ...patch } = body;
    return jsonOk(await updateInstruction(db, id, patch));
  }, request);
}

export async function DELETE(request: Request) {
  return withAdmin(async ({ db, request: req }) => {
    const body = await parseJson<{ id?: string; restore?: boolean }>(req);
    if (!body.id) throw new Error("Missing id.");
    return jsonOk(await deleteInstruction(db, body.id, Boolean(body.restore)));
  }, request);
}
