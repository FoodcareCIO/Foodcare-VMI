import { jsonOk, parseJson, withAdmin } from "@/lib/api/server";
import { parsePagination, parseSearch, parseSort } from "@/lib/pagination";
import {
  DEVICE_DEFAULT_SORT,
  deviceSortColumns,
} from "@/lib/sort-config";
import { listDevices, setDeviceRevoked } from "@/lib/services/admin-data";

export async function GET(request: Request) {
  return withAdmin(async ({ db, request: req }) => {
    const pagination = parsePagination(req);
    const sort = parseSort(req, {
      columns: deviceSortColumns,
      defaultColumn: DEVICE_DEFAULT_SORT,
      defaultAscending: false,
    });
    return jsonOk(await listDevices(db, pagination, sort, parseSearch(req)));
  }, request);
}

export async function PATCH(request: Request) {
  return withAdmin(async ({ db, request: req }) => {
    const body = await parseJson<{ id?: string; revoked?: boolean }>(req);
    if (!body.id) throw new Error("Missing id.");
    return jsonOk(await setDeviceRevoked(db, body.id, Boolean(body.revoked)));
  }, request);
}
