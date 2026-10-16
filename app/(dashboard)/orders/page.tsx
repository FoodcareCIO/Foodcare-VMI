"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  LinkButton,
  LoadingPage,
  PageHeader,
  Pagination,
  Select,
  SortableTableHeaderCell,
  Table,
  TableBodySection,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeaderCell,
  TableRow,
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
  { value: "failed", label: "Email problems" },
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
  if (error && !data) return <EmptyState message="Could not load orders. Please try again." />;

  const orders = data?.orders ?? [];

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Orders your sales reps have submitted."
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <TableSearch
          value={search}
          onChange={setSearch}
          placeholder="Search orders"
          disabled={refreshing}
        />
        <div className="w-48">
          <Select
            value={emailFilter ?? "all"}
            options={EMAIL_FILTER_OPTIONS}
            onChange={setEmailFilter}
            aria-label="Show"
            disabled={refreshing}
          />
        </div>
      </div>
      {emailFilter ? (
        <Alert
          tone="warning"
          className="mb-4"
          action={
            <Button variant="secondary" size="sm" onClick={() => setEmailFilter("all")}>
              Show all orders
            </Button>
          }
        >
          Showing only orders that could not be emailed.
        </Alert>
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
              <TableHeaderCell>Sales rep</TableHeaderCell>
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
                <TableEmptyRow
                  colSpan={7}
                  message={emailFilter ? "No orders need attention." : "No orders yet."}
                />
              ) : (
                orders.map((order) => {
                  const sites = order.customer_sites as { name?: string } | null;
                  const reps = order.sales_reps as {
                    users?: { display_name?: string } | null;
                  } | null;
                  const emailState = order.email_state as OrderEmailState;
                  return (
                    <TableRow key={String(order.id)}>
                      <TableCell strong>{sites?.name ?? "-"}</TableCell>
                      <TableCell muted>{reps?.users?.display_name ?? "-"}</TableCell>
                      <TableCell>
                        <Badge value={String(order.status)} />
                      </TableCell>
                      <TableCell>
                        <Badge value={emailState} label={ORDER_EMAIL_LABELS[emailState]} />
                      </TableCell>
                      <TableCell>
                        <PhotoCount
                          expected={order.photos_expected as number | null}
                          received={Number(order.photos_received ?? 0)}
                        />
                      </TableCell>
                      <TableCell muted nowrap>
                        {formatDate(
                          (order.completed_at ?? order.started_at) as string,
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <LinkButton href={`/orders/${order.id}`} variant="ghost" size="sm">
                          View
                        </LinkButton>
                      </TableCell>
                    </TableRow>
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
  if (expected === null) return <span className="text-fg-muted">{received}</span>;
  const missing = received < expected;
  return (
    <span
      className={missing ? "font-semibold text-warning-text" : "text-fg-muted"}
      title={missing ? `${expected - received} photo(s) not received yet` : undefined}
    >
      {received}/{expected}
    </span>
  );
}
