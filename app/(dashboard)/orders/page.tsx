"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Badge,
  Card,
  EmptyState,
  LoadingPage,
  PageHeader,
  Pagination,
  Select,
  SortableTableHeaderCell,
  Table,
  TableBodySection,
  TableHead,
  TableHeaderCell,
  TableSearch,
  formatDate,
} from "@/components/ui";
import { usePaginatedQuery } from "@/lib/api/use-paginated-query";
import { ORDER_EMAIL_LABELS, type OrderEmailState } from "@/lib/order-email";
import type { PaginatedOrdersResponse } from "@/lib/pagination";
import {
  ORDER_DEFAULT_DIR,
  ORDER_DEFAULT_SORT,
} from "@/lib/sort-config";

const EMAIL_FILTER_OPTIONS = [
  { value: "all", label: "All orders" },
  { value: "failed", label: "Email failed" },
];

export default function OrdersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const emailFilter = searchParams.get("email") === "failed" ? "failed" : null;
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
    extraParams: { email: emailFilter },
  });

  const setEmailFilter = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "failed") params.set("email", "failed");
    else params.delete("email");
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  if (initialLoading) return <LoadingPage label="Loading orders..." />;
  if (error && !data) return <EmptyState message="Could not load data. Please try again." />;

  const orders = data?.orders ?? [];

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Orders submitted by sales reps in the field."
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <TableSearch
          value={search}
          onChange={setSearch}
          placeholder="Search orders..."
          disabled={refreshing}
        />
        <div className="w-48">
          <Select
            value={emailFilter ?? "all"}
            options={EMAIL_FILTER_OPTIONS}
            onChange={setEmailFilter}
            aria-label="Filter by email status"
            disabled={refreshing}
          />
        </div>
      </div>
      {emailFilter ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-base text-amber-900">
          <span>Showing orders whose email failed or whose report could not be created.</span>
          <button
            type="button"
            onClick={() => setEmailFilter("all")}
            className="font-medium underline-offset-2 hover:underline"
          >
            Show all orders
          </button>
        </div>
      ) : null}
      <Card className="overflow-hidden">
        <TableBodySection loading={refreshing}>
          <Table>
            <TableHead>
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
              <TableHeaderCell>Email</TableHeaderCell>
              <TableHeaderCell>Photos</TableHeaderCell>
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
                  <td colSpan={7} className="px-6 py-12 text-center text-base text-slate-400">
                    {emailFilter ? "No orders need attention." : "No orders yet."}
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const sites = order.customer_sites as { name?: string } | null;
                  const reps = order.sales_reps as {
                    users?: { display_name?: string } | null;
                  } | null;
                  const emailState = order.email_state as OrderEmailState;
                  return (
                    <tr
                      key={String(order.id)}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">{sites?.name ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {reps?.users?.display_name ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge value={String(order.status)} />
                      </td>
                      <td className="px-4 py-3">
                        <Badge value={emailState} label={ORDER_EMAIL_LABELS[emailState]} />
                      </td>
                      <td className="px-4 py-3">
                        <PhotoCount
                          expected={order.photos_expected as number | null}
                          received={Number(order.photos_received ?? 0)}
                        />
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

function PhotoCount({ expected, received }: { expected: number | null; received: number }) {
  if (expected === null) return <span className="text-slate-600">{received}</span>;
  const missing = received < expected;
  return (
    <span
      className={missing ? "font-medium text-amber-600" : "text-slate-600"}
      title={missing ? `${expected - received} photo(s) not received yet` : undefined}
    >
      {received}/{expected}
    </span>
  );
}
