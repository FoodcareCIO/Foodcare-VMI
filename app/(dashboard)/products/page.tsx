"use client";

import {
  EntityManager,
  type ColumnDef,
  type FieldDef,
} from "@/components/entity-manager";
import { LoadingPage, PageHeader, EmptyState } from "@/components/ui";
import { usePaginatedQuery } from "@/lib/api/use-paginated-query";
import type { PaginatedRowsResponse } from "@/lib/pagination";
import { PRODUCT_DEFAULT_SORT } from "@/lib/sort-config";
import { ProductImport } from "@/features/products/product-import";

const fields: FieldDef[] = [
  { name: "sku", label: "Product code", required: true },
  { name: "name", label: "Product name", required: true },
  { name: "default_unit", label: "Default unit", required: true },
  { name: "pack_size", label: "Pack size", type: "number", step: "0.01" },
  { name: "pack_unit", label: "Pack unit" },
];

const columns: ColumnDef[] = [
  { key: "sku", label: "Product code" },
  { key: "name", label: "Name" },
  { key: "default_unit", label: "Unit" },
  { key: "pack_size", label: "Pack size" },
  { key: "pack_unit", label: "Pack unit" },
];

export default function ProductsPage() {
  const { data, error, initialLoading, refreshing, reload, setPage, setLimit, sort, sortDir, setSort, search, setSearch } =
    usePaginatedQuery<PaginatedRowsResponse>("/api/products", {
      defaultSort: PRODUCT_DEFAULT_SORT,
    });

  if (initialLoading) return <LoadingPage label="Loading products..." />;
  if (error && !data) return <EmptyState message="Could not load data. Please try again." />;

  return (
    <div>
      <PageHeader
        title="Products & Minimums"
        description="Add and edit products. Set minimum stock levels on each site page."
      />
      <EntityManager
        apiBase="/api/products"
        rows={data?.rows ?? []}
        columns={columns}
        fields={fields}
        createLabel="Add product"
        emptyMessage="No products yet."
        onMutate={reload}
        refreshing={refreshing}
        toolbarActions={<ProductImport onImported={reload} />}
        sort={{ column: sort, dir: sortDir, onChange: setSort }}
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search products...",
        }}
        pagination={
          data
            ? {
                page: data.page,
                limit: data.limit,
                total: data.total,
                totalPages: data.totalPages,
                onPageChange: setPage,
                onLimitChange: setLimit,
              }
            : undefined
        }
      />
    </div>
  );
}
