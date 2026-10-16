"use client";

import { useMemo } from "react";

import { OrderStatusChart } from "@/components/overview/overview-parts";
import {
  Alert,
  Badge,
  Card,
  EmptyState,
  LinkButton,
  LoadingPage,
  PageHeader,
  SectionHeader,
  SortableTableHeaderCell,
  StatCard,
  Table,
  TableBodySection,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  formatDate,
} from "@/components/ui";
import { useClientTableSort } from "@/lib/api/use-client-table-sort";
import { useApiQuery } from "@/lib/api/use-query";

interface OverviewData {
  metrics: {
    sites: number;
    products: number;
    reps: number;
    submittedOrders: number;
    totalOrders: number;
    failedExports: number;
  };
  statusBreakdown: {
    draft: number;
    completed: number;
    rejected: number;
  };
  recent: {
    id: string;
    status: string;
    started_at: string;
    completed_at: string | null;
    customer_sites: { name: string } | null;
  }[];
  orderEmailMissing: boolean;
}

const todayLabel = new Date().toLocaleDateString([], {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

export default function OverviewPage() {
  const { data, error, loading } = useApiQuery<OverviewData>("/api/overview");
  const recent = data?.recent ?? [];
  const recentAccessors = useMemo(
    () => ({
      site: (order: OverviewData["recent"][number]) => order.customer_sites?.name ?? "",
      status: (order: OverviewData["recent"][number]) => order.status,
      date: (order: OverviewData["recent"][number]) =>
        order.completed_at ?? order.started_at,
    }),
    [],
  );
  const { sortedRows: sortedRecent, sort, sortDir, setSort } = useClientTableSort(
    recent,
    recentAccessors,
    "date",
    "desc",
  );

  if (loading) {
    return <LoadingPage label="Loading overview..." />;
  }

  if (error || !data) {
    return <EmptyState message="Could not load the overview. Please try again." />;
  }

  const { metrics, statusBreakdown } = data;
  const completionRate =
    metrics.totalOrders > 0
      ? Math.round((metrics.submittedOrders / metrics.totalOrders) * 100)
      : 0;

  return (
    <div className="space-y-8">
      <PageHeader title="Overview" description={todayLabel} />

      {data.orderEmailMissing || metrics.failedExports > 0 ? (
        <div className="space-y-3">
          {data.orderEmailMissing ? (
            <Alert
              tone="warning"
              title="No main order email yet"
              action={
                <LinkButton href="/settings" variant="secondary" size="sm">
                  Go to Settings
                </LinkButton>
              }
            >
              Orders can&apos;t be emailed until you add a main order email in Settings.
            </Alert>
          ) : null}

          {metrics.failedExports > 0 ? (
            <Alert
              tone="warning"
              title={
                metrics.failedExports === 1
                  ? "1 order could not be emailed"
                  : `${metrics.failedExports} orders could not be emailed`
              }
              action={
                <LinkButton href="/orders?email=failed" variant="secondary" size="sm">
                  View orders
                </LinkButton>
              }
            >
              Open them to see what went wrong and try again.
            </Alert>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Sites" value={metrics.sites} icon="mdi:map-marker-outline" href="/sites" />
        <StatCard label="Products" value={metrics.products} icon="mdi:package-variant" href="/products" />
        <StatCard label="Sales reps" value={metrics.reps} icon="mdi:account-group-outline" href="/reps" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card padding="lg">
          <SectionHeader title="Orders by status" icon="mdi:chart-donut" />
          <OrderStatusChart breakdown={statusBreakdown} />
        </Card>

        <Card padding="lg" className="flex flex-col">
          <SectionHeader title="Order summary" icon="mdi:clipboard-text-outline" />
          <ul className="flex flex-1 flex-col justify-center divide-y divide-line">
            <li className="flex items-center justify-between gap-4 py-3 first:pt-0">
              <span className="text-fg-muted">Submitted orders</span>
              <span className="text-lg font-semibold text-fg">{metrics.submittedOrders}</span>
            </li>
            <li className="flex items-center justify-between gap-4 py-3">
              <span className="text-fg-muted">Share of orders submitted</span>
              <span className="text-lg font-semibold text-fg">{completionRate}%</span>
            </li>
            <li className="flex items-center justify-between gap-4 py-3 last:pb-0">
              <span className="text-fg-muted">Orders with email problems</span>
              <span
                className={`text-lg font-semibold ${metrics.failedExports > 0 ? "text-danger-text" : "text-fg"}`}
              >
                {metrics.failedExports}
              </span>
            </li>
          </ul>
        </Card>
      </div>

      <div>
        <SectionHeader
          title="Recent orders"
          icon="mdi:history"
          actions={
            <LinkButton href="/orders" variant="ghost" size="sm" icon="mdi:arrow-right" iconPosition="right">
              View all
            </LinkButton>
          }
        />
        <Card className="overflow-hidden">
          {recent.length === 0 ? (
            <EmptyState message="No orders yet. They will show up here once a rep submits one." />
          ) : (
            <TableBodySection>
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
                  {sortedRecent.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell strong>{order.customer_sites?.name ?? "-"}</TableCell>
                      <TableCell>
                        <Badge value={order.status} />
                      </TableCell>
                      <TableCell muted nowrap>
                        {formatDate(order.completed_at ?? order.started_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <LinkButton href={`/orders/${order.id}`} variant="ghost" size="sm">
                          Open
                        </LinkButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </Table>
            </TableBodySection>
          )}
        </Card>
      </div>
    </div>
  );
}
