import { jsonOk, withAdmin } from "@/lib/api/server";
import { parsePagination, parseSearch, parseSort } from "@/lib/pagination";
import {
  ORDER_DEFAULT_SORT,
  orderSortColumns,
} from "@/lib/sort-config";
import { listOrders } from "@/lib/services/admin-data";

export async function GET(request: Request) {
  return withAdmin(async ({ db, request: req }) => {
    const pagination = parsePagination(req);
    const sort = parseSort(req, {
      columns: orderSortColumns,
      defaultColumn: ORDER_DEFAULT_SORT,
      defaultAscending: false,
    });
    return jsonOk(await listOrders(db, pagination, sort, parseSearch(req)));
  }, request);
}
