"use client";

import Link from "next/link";
import { use, useMemo } from "react";

import { RejectForm } from "@/components/reject-form";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  LoadingPage,
  MetricCard,
  PageHeader,
  SortableTableHeaderCell,
  Table,
  TableHead,
  TableHeaderCell,
  formatDate,
} from "@/components/ui";
import { api } from "@/lib/api/client";
import { useClientTableSort } from "@/lib/api/use-client-table-sort";
import { useApiQuery } from "@/lib/api/use-query";

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const { data, error, loading, reload } = useApiQuery<{
    order: Record<string, unknown>;
  }>(`/api/orders/${orderId}`);

  const items =
    ((data?.order.stock_count_items as Record<string, unknown>[] | null) ?? []);
  const itemAccessors = useMemo(
    () => ({
      product_sku_snapshot: (item: Record<string, unknown>) =>
        item.product_sku_snapshot as string | number | null | undefined,
      product_name_snapshot: (item: Record<string, unknown>) =>
        item.product_name_snapshot as string | number | null | undefined,
      minimum_quantity_snapshot: (item: Record<string, unknown>) =>
        item.minimum_quantity_snapshot as string | number | null | undefined,
      current_quantity: (item: Record<string, unknown>) =>
        item.current_quantity as string | number | null | undefined,
      suggested_order_quantity: (item: Record<string, unknown>) =>
        item.suggested_order_quantity as string | number | null | undefined,
      order_quantity: (item: Record<string, unknown>) =>
        item.order_quantity as string | number | null | undefined,
      unit_of_measure_snapshot: (item: Record<string, unknown>) =>
        item.unit_of_measure_snapshot as string | number | null | undefined,
    }),
    [],
  );
  const { sortedRows: sortedItems, sort, sortDir, setSort } = useClientTableSort(
    items,
    itemAccessors,
    "product_name_snapshot",
  );

  if (loading) return <LoadingPage label="Loading order..." />;
  if (error || !data) {
    return <EmptyState message="Could not load this order. Please try again." />;
  }

  const order = data.order;
  const customers = order.customers as { name?: string } | null;
  const sites = order.customer_sites as { name?: string; address?: string } | null;
  const reps = order.sales_reps as {
    users?: { display_name?: string } | null;
  } | null;
  const exports = (order.stock_count_exports as Record<string, unknown>[] | null) ?? [];
  const exportRow = exports[0];

  async function downloadExport() {
    const result = await api.get<{ url: string }>(`/api/orders/${orderId}/export`);
    window.location.href = result.url;
  }

  return (
    <div>
      <PageHeader
        title={`${customers?.name ?? "Order"} - ${sites?.name ?? ""}`}
        description={sites?.address}
        actions={
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-base font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            <Icon icon="mdi:arrow-left" width={16} height={16} />
            Back to orders
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricCard label="Status" value={<Badge value={String(order.status)} />} />
        <MetricCard label="Products" value={items.length} />
        <MetricCard
          label="Rep"
          value={
            <span className="text-base font-medium">
              {reps?.users?.display_name ?? "-"}
            </span>
          }
        />
        <MetricCard
          label="Submitted"
          value={
            <span className="text-base font-medium">
              {formatDate(
                (order.completed_at ?? order.started_at) as string | null,
              )}
            </span>
          }
        />
      </div>

      {order.rejection_reason ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-base text-red-700">
          <strong>Rejected:</strong> {String(order.rejection_reason)}
        </div>
      ) : null}

      <div className="mb-6 flex flex-wrap items-center gap-4">
        {exportRow?.storage_path ? (
          <Button
            variant="secondary"
            icon="mdi:download"
            onClick={() => void downloadExport()}
          >
            Download report ({String(exportRow.file_name)})
          </Button>
        ) : (
          <span className="text-base text-slate-400">Report not ready yet.</span>
        )}
        {order.status === "completed" && (
          <RejectForm orderId={orderId} onSuccess={reload} />
        )}
      </div>

      <h2 className="mb-3 text-xl tracking-tight text-slate-900">Products in this order</h2>
      <Card>
        {items.length === 0 ? (
          <EmptyState message="No products in this order." />
        ) : (
          <Table>
            <TableHead>
              <SortableTableHeaderCell
                sortKey="product_sku_snapshot"
                activeSort={sort}
                activeDir={sortDir}
                onSort={setSort}
              >
                Product code
              </SortableTableHeaderCell>
              <SortableTableHeaderCell
                sortKey="product_name_snapshot"
                activeSort={sort}
                activeDir={sortDir}
                onSort={setSort}
              >
                Product
              </SortableTableHeaderCell>
              <SortableTableHeaderCell
                sortKey="minimum_quantity_snapshot"
                activeSort={sort}
                activeDir={sortDir}
                onSort={setSort}
              >
                Minimum
              </SortableTableHeaderCell>
              <SortableTableHeaderCell
                sortKey="current_quantity"
                activeSort={sort}
                activeDir={sortDir}
                onSort={setSort}
              >
                On hand
              </SortableTableHeaderCell>
              <SortableTableHeaderCell
                sortKey="suggested_order_quantity"
                activeSort={sort}
                activeDir={sortDir}
                onSort={setSort}
              >
                Suggested
              </SortableTableHeaderCell>
              <SortableTableHeaderCell
                sortKey="order_quantity"
                activeSort={sort}
                activeDir={sortDir}
                onSort={setSort}
              >
                Order qty
              </SortableTableHeaderCell>
              <SortableTableHeaderCell
                sortKey="unit_of_measure_snapshot"
                activeSort={sort}
                activeDir={sortDir}
                onSort={setSort}
              >
                Unit
              </SortableTableHeaderCell>
            </TableHead>
            <tbody>
              {sortedItems.map((item) => (
                <tr key={String(item.id)} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-600">
                    {String(item.product_sku_snapshot)}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {String(item.product_name_snapshot)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {String(item.minimum_quantity_snapshot)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {String(item.current_quantity)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {String(item.suggested_order_quantity)}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {String(item.order_quantity)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {String(item.unit_of_measure_snapshot)}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
