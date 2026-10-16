"use client";

import { use, useMemo } from "react";

import { RejectForm } from "@/components/reject-form";
import { OrderEmailCard } from "@/features/orders/order-email-card";
import { OrderPhotos, type OrderPhoto } from "@/features/orders/order-photos";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingPage,
  PageHeader,
  SectionHeader,
  SortableTableHeaderCell,
  StatCard,
  Table,
  TableBodySection,
  TableCell,
  TableHead,
  TableRow,
  formatDate,
} from "@/components/ui";
import { api } from "@/lib/api/client";
import { useClientTableSort } from "@/lib/api/use-client-table-sort";
import { useApiQuery } from "@/lib/api/use-query";
import type { OrderEmailState } from "@/lib/order-email";
import type { StockCountExport } from "@/lib/types";

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
  const sites = order.customer_sites as { name?: string; address?: string } | null;
  const reps = order.sales_reps as {
    users?: { display_name?: string } | null;
  } | null;
  const exports = (order.stock_count_exports as Partial<StockCountExport>[] | null) ?? [];
  const exportRow = exports[0];

  async function downloadExport() {
    const result = await api.get<{ url: string }>(`/api/orders/${orderId}/export`);
    window.location.href = result.url;
  }

  const sortHeader = (key: string, label: string) => (
    <SortableTableHeaderCell
      sortKey={key}
      activeSort={sort}
      activeDir={sortDir}
      onSort={setSort}
    >
      {label}
    </SortableTableHeaderCell>
  );

  return (
    <div>
      <PageHeader
        back={{ href: "/orders", label: "Back to orders" }}
        title={sites?.name ?? "Order"}
        description={sites?.address}
        actions={
          <>
            {exportRow?.storage_path ? (
              <Button
                icon="mdi:download"
                onClick={() => void downloadExport()}
                title={String(exportRow.file_name)}
              >
                Download Excel report
              </Button>
            ) : (
              <span className="text-sm text-fg-muted">The Excel report is not ready yet.</span>
            )}
            {order.status === "completed" && (
              <RejectForm orderId={orderId} onSuccess={reload} />
            )}
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Status" value={<Badge value={String(order.status)} />} compact />
        <StatCard label="Products" value={items.length} />
        <StatCard label="Sales rep" value={reps?.users?.display_name ?? "-"} compact />
        <StatCard
          label="Submitted"
          value={formatDate((order.completed_at ?? order.started_at) as string | null)}
          compact
        />
      </div>

      {order.rejection_reason ? (
        <Alert tone="danger" title="This order was rejected" className="mb-6">
          {String(order.rejection_reason)}
        </Alert>
      ) : null}

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <OrderEmailCard
          orderId={orderId}
          orderStatus={String(order.status)}
          state={order.email_state as OrderEmailState}
          exportRow={exportRow ?? null}
          onResent={reload}
        />
        <OrderPhotos
          photos={(order.photos as OrderPhoto[] | undefined) ?? []}
          expected={(order.photos_expected as number | null | undefined) ?? null}
          received={Number(order.photos_received ?? 0)}
        />
      </div>

      <SectionHeader title="Products in this order" icon="mdi:package-variant" />
      <Card className="overflow-hidden">
        {items.length === 0 ? (
          <EmptyState message="There are no products in this order." />
        ) : (
          <TableBodySection>
            <Table>
              <TableHead>
                {sortHeader("product_sku_snapshot", "Product code")}
                {sortHeader("product_name_snapshot", "Product")}
                {sortHeader("minimum_quantity_snapshot", "Minimum")}
                {sortHeader("current_quantity", "In stock")}
                {sortHeader("suggested_order_quantity", "Suggested")}
                {sortHeader("order_quantity", "To order")}
                {sortHeader("unit_of_measure_snapshot", "Unit")}
              </TableHead>
              <tbody>
                {sortedItems.map((item) => (
                  <TableRow key={String(item.id)}>
                    <TableCell muted>{String(item.product_sku_snapshot)}</TableCell>
                    <TableCell strong>{String(item.product_name_snapshot)}</TableCell>
                    <TableCell muted>{String(item.minimum_quantity_snapshot)}</TableCell>
                    <TableCell muted>{String(item.current_quantity)}</TableCell>
                    <TableCell muted>{String(item.suggested_order_quantity)}</TableCell>
                    <TableCell strong>{String(item.order_quantity)}</TableCell>
                    <TableCell muted>{String(item.unit_of_measure_snapshot)}</TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          </TableBodySection>
        )}
      </Card>
    </div>
  );
}
