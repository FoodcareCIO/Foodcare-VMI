"use client";

import Link from "next/link";
import { useMemo } from "react";

import {
  CatalogBars,
  OrderStatusChart,
  OverviewStatCard,
  QuickAction,
} from "@/components/overview/overview-parts";
import {
  Badge,
  Card,
  EmptyState,
  Icon,
  LoadingPage,
  PageHeader,
  SortableTableHeaderCell,
  Table,
  TableHead,
  TableHeaderCell,
  formatDate,
} from "@/components/ui";
import { useClientTableSort } from "@/lib/api/use-client-table-sort";
import { useApiQuery } from "@/lib/api/use-query";

interface OverviewData {
  metrics: {
    customers: number;
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
    customers: { name: string } | null;
    customer_sites: { name: string } | null;
  }[];
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
      customer: (order: OverviewData["recent"][number]) => order.customers?.name ?? "",
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
    return <EmptyState message="Could not load overview. Please try again." />;
  }

  const { metrics, statusBreakdown } = data;
  const completionRate =
    metrics.totalOrders > 0
      ? Math.round((metrics.submittedOrders / metrics.totalOrders) * 100)
      : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        description={todayLabel}
        actions={
          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Up to date
          </div>
        }
      />

      {metrics.failedExports > 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Icon icon="mdi:alert-outline" width={22} height={22} className="mt-0.5 text-amber-600" />
          <div>
            <p className="text-base font-semibold text-amber-900">
              {metrics.failedExports} report{metrics.failedExports === 1 ? "" : "s"} need attention
            </p>
            <p className="mt-0.5 text-base text-amber-800/80">
              Some order reports could not be created or sent. Please review those orders.
            </p>
          </div>
          <Link
            href="/orders"
            className="ml-auto shrink-0 text-base font-medium text-amber-900 underline-offset-2 hover:underline"
          >
            View orders
          </Link>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewStatCard
          label="Customers"
          value={metrics.customers}
          icon="mdi:office-building-outline"
          href="/customers"
          accent="emerald"
        />
        <OverviewStatCard
          label="Sites"
          value={metrics.sites}
          icon="mdi:map-marker-outline"
          href="/customers"
          accent="sky"
        />
        <OverviewStatCard
          label="Products"
          value={metrics.products}
          icon="mdi:package-variant"
          href="/products"
          accent="violet"
        />
        <OverviewStatCard
          label="Sales reps"
          value={metrics.reps}
          icon="mdi:account-group-outline"
          href="/reps"
          accent="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-1 rounded-3xl!">
          <div className="mb-5 flex items-center gap-2">
            <Icon icon="mdi:chart-donut" width={20} height={20} className="text-emerald-600" />
            <h2 className="text-lg leading-none! text-slate-900">Order status</h2>
          </div>
          <OrderStatusChart breakdown={statusBreakdown} />
        </Card>

        <Card className="p-6 lg:col-span-1 rounded-3xl!">
          <div className="mb-5 flex items-center gap-2">
            <Icon icon="mdi:chart-bar" width={20} height={20} className="text-sky-600" />
            <h2 className="text-lg text-slate-900">Your business at a glance</h2>
          </div>
          <CatalogBars
            customers={metrics.customers}
            sites={metrics.sites}
            products={metrics.products}
            reps={metrics.reps}
          />
        </Card>

        <Card className="p-6 lg:col-span-1 rounded-3xl!">
          <div className="mb-5 flex items-center gap-2">
            <Icon icon="mdi:lightning-bolt-outline" width={20} height={20} className="text-violet-600" />
            <h2 className="text-lg text-slate-900">Quick actions</h2>
          </div>
          <div className="space-y-3">
            <QuickAction
              href="/customers"
              icon="mdi:plus-circle-outline"
              label="Manage customers"
              description="Sites, contacts, and instructions"
            />
            <QuickAction
              href="/orders"
              icon="mdi:clipboard-list-outline"
              label="Review orders"
              description="Orders submitted by sales reps"
            />
            <QuickAction
              href="/reps"
              icon="mdi:link-variant"
              label="Rep assignments"
              description="Choose which customers each rep can see"
            />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Icon icon="mdi:check-circle-outline" width={22} height={22} />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-base font-medium text-slate-500">Orders completed</p>
              <p className="text-xl font-bold tracking-tight text-slate-900">{metrics.submittedOrders}</p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600">
              <Icon icon="mdi:percent-outline" width={22} height={22} />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-base font-medium text-slate-500">Percent submitted</p>
              <p className="text-xl font-bold tracking-tight text-slate-900">{completionRate}%</p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
              <Icon icon="mdi:close" width={22} height={22} />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-base font-medium text-slate-500">Report issues</p>
              <p className="text-xl font-bold tracking-tight text-slate-900">{metrics.failedExports}</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon icon="mdi:history" width={20} height={20} className="text-slate-400" />
            <h2 className="text-xl text-slate-900">Recent orders</h2>
          </div>
          <Link
            href="/orders"
            className="inline-flex items-center gap-1 text-base font-medium text-emerald-600 hover:text-emerald-700"
          >
            View all
            <Icon icon="mdi:arrow-right" width={16} height={16} />
          </Link>
        </div>
        <Card>
          {recent.length === 0 ? (
            <EmptyState message="No orders yet." />
          ) : (
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
                  <tr
                    key={order.id}
                    className="border-b border-slate-100 last:border-0 transition hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      <span className="inline-flex items-center gap-2">
                        <Icon
                          icon="mdi:office-building-outline"
                          width={16}
                          height={16}
                          className="text-slate-400"
                        />
                        {order.customers?.name ?? "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {order.customer_sites?.name ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={order.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(order.completed_at ?? order.started_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/orders/${order.id}`}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-emerald-600 hover:bg-emerald-50"
                      >
                        Open
                        <Icon icon="mdi:open-in-new" width={14} height={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
