import { jsonOk, parseJson, withAdmin } from "@/lib/api/server";
import { parsePagination, parseSearch, parseSort } from "@/lib/pagination";
import {
  ASSIGNMENT_DEFAULT_SORT,
  assignmentSortColumns,
} from "@/lib/sort-config";
import { getRepAssignments, setRepAssignment } from "@/lib/services/admin-data";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ repId: string }> },
) {
  const { repId } = await params;
  return withAdmin(async ({ db, request: req }) => {
    const pagination = parsePagination(req);
    const sort = parseSort(req, {
      columns: assignmentSortColumns,
      defaultColumn: ASSIGNMENT_DEFAULT_SORT,
    });
    return jsonOk(await getRepAssignments(db, repId, pagination, sort, parseSearch(req)));
  }, request);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ repId: string }> },
) {
  const { repId } = await params;
  return withAdmin(async ({ db, request: req }) => {
    const body = await parseJson<{ customer_id?: string; assigned?: boolean }>(req);
    if (!body.customer_id) throw new Error("customer_id is required.");
    return jsonOk(
      await setRepAssignment(db, repId, body.customer_id, Boolean(body.assigned)),
    );
  }, request);
}
