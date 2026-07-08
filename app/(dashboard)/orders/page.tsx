"use client";

import Link from "next/link";

import {
  Badge,
  Card,
  EmptyState,
  LoadingPage,
  PageHeader,
  Pagination,
  SortableTableHeaderCell,
  Table,
  TableBodySection,
  TableHead,
  TableHeaderCell,
  TableSearch,
  formatDate,
} from "@/components/ui";
import { usePaginatedQuery } from "@/lib/api/use-paginated-query";
import type { PaginatedOrdersResponse } from "@/lib/pagination";
import {
  ORDER_DEFAULT_DIR,
  ORDER_DEFAULT_SORT,
} from "@/lib/sort-config";

export default function OrdersPage() {
  const {
    data,
    error,
    initialLoading,
    refreshing,
    setPage,
    setLimit,
    sort,
    sortDir,
    setSort,
    search,
    setSearch,
  } = usePaginatedQuery<PaginatedOrdersResponse>("/api/orders", {
    defaultSort: ORDER_DEFAULT_SORT,
    defaultDir: ORDER_DEFAULT_DIR,
  });

  if (initialLoading) return <LoadingPage label="Loading orders..." />;
  if (error && !data) return <EmptyState message="Could not load data. Please try again." />;

  const orders = data?.orders ?? [];

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Orders submitted by sales reps in the field."
      />
      <div className="mb-4">
        <TableSearch
          value={search}
          onChange={setSearch}
          placeholder="Search orders..."
          disabled={refreshing}
        />
      </div>
      <Card className="overflow-hidden">
        <TableBodySection loading={refreshing}>
          <Table>
            <TableHead>
              <SortableTableHeaderCell
                sortKey="customer"
                activeSort={sort}
                activeDir={sortDir}
                onSort={setSort}
              >
                Customer
              </SortableTableHeaderCell>
              <SortableTableHeaderCell
                sortKey="site"
                activeSort={sort}
                activeDir={sortDir}
                onSort={setSort}
              >
                Site
              </SortableTableHeaderCell>
              <TableHeaderCell>Rep</TableHeaderCell>
              <SortableTableHeaderCell
                sortKey="status"
                activeSort={sort}
                activeDir={sortDir}
                onSort={setSort}
              >
                Status
              </SortableTableHeaderCell>
              <SortableTableHeaderCell
                sortKey="date"
                activeSort={sort}
                activeDir={sortDir}
                onSort={setSort}
              >
                Date
              </SortableTableHeaderCell>
              <TableHeaderCell />
            </TableHead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-base text-slate-400">
                    No orders yet.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const customers = order.customers as { name?: string } | null;
                  const sites = order.customer_sites as { name?: string } | null;
                  const reps = order.sales_reps as {
                    users?: { display_name?: string } | null;
                  } | null;
                  return (
                    <tr
                      key={String(order.id)}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {customers?.name ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{sites?.name ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {reps?.users?.display_name ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge value={String(order.status)} />
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(
                          (order.completed_at ?? order.started_at) as string,
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/orders/${order.id}`}
                          className="rounded-md px-2 py-1 text-sm font-medium text-emerald-600 hover:bg-emerald-50"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </TableBodySection>
        {data && data.total > 0 ? (
          <Pagination
            page={data.page}
            limit={data.limit}
            total={data.total}
            totalPages={data.totalPages}
            onPageChange={setPage}
            onLimitChange={setLimit}
            busy={refreshing}
          />
        ) : null}
      </Card>
    </div>
  );
}
