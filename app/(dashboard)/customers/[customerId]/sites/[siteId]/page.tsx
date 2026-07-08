"use client";

import Link from "next/link";
import { use } from "react";

import {
  EntityManager,
  type ColumnDef,
  type FieldDef,
} from "@/components/entity-manager";
import { EmptyState, LoadingPage, PageHeader } from "@/components/ui";
import { usePaginatedQuery } from "@/lib/api/use-paginated-query";
import { useApiQuery } from "@/lib/api/use-query";
import type { PaginatedRowsResponse } from "@/lib/pagination";
import {
  INSTRUCTION_DEFAULT_SORT,
  SITE_PRODUCT_DEFAULT_SORT,
} from "@/lib/sort-config";

const categoryOptions = [
  { value: "general", label: "General" },
  { value: "arrival", label: "Arrival" },
  { value: "stock", label: "Stock" },
  { value: "safety", label: "Safety" },
  { value: "access", label: "Access" },
  { value: "other", label: "Other" },
];

export default function SiteDetailPage({
  params,
}: {
  params: Promise<{ customerId: string; siteId: string }>;
}) {
  const { customerId, siteId } = use(params);
  const { data: siteData, error: siteError, initialLoading: siteInitialLoading } = useApiQuery<{
    site: { name: string; address: string };
    products: { id: string; sku: string; name: string }[];
  }>(`/api/sites/${siteId}`);

  const {
    data: instructionsData,
    error: instructionsError,
    initialLoading: instructionsInitialLoading,
    refreshing: instructionsRefreshing,
    reload: reloadInstructions,
    setPage: setInstructionsPage,
    setLimit: setInstructionsLimit,
    sort: instructionsSort,
    sortDir: instructionsSortDir,
    setSort: setInstructionsSort,
    search: instructionsSearch,
    setSearch: setInstructionsSearch,
  } = usePaginatedQuery<PaginatedRowsResponse>("/api/instructions", {
    prefix: "instructions",
    defaultSort: INSTRUCTION_DEFAULT_SORT,
    extraParams: { site_id: siteId },
  });

  const {
    data: siteProductsData,
    error: siteProductsError,
    initialLoading: siteProductsInitialLoading,
    refreshing: siteProductsRefreshing,
    reload: reloadSiteProducts,
    setPage: setProductsPage,
    setLimit: setProductsLimit,
    sort: productsSort,
    sortDir: productsSortDir,
    setSort: setProductsSort,
    search: productsSearch,
    setSearch: setProductsSearch,
  } = usePaginatedQuery<PaginatedRowsResponse>("/api/site-products", {
    prefix: "products",
    defaultSort: SITE_PRODUCT_DEFAULT_SORT,
    extraParams: { site_id: siteId },
  });

  if (siteInitialLoading) {
    return <LoadingPage label="Loading site..." />;
  }
  if (siteError || !siteData) {
    return <EmptyState message="Could not load this site. Please try again." />;
  }

  const productOptions = siteData.products.map((p) => ({
    value: p.id,
    label: `${p.sku} - ${p.name}`,
  }));
  const productLabelLookup = Object.fromEntries(
    siteData.products.map((p) => [p.id, `${p.sku} - ${p.name}`]),
  );

  const instructionFields: FieldDef[] = [
    { name: "instruction", label: "Instruction", type: "textarea", required: true },
    { name: "title", label: "Title" },
    { name: "category", label: "Category", type: "select", options: categoryOptions },
    { name: "sort_order", label: "Display order", type: "number", step: "1" },
    { name: "image_url", label: "Image link" },
    {
      name: "sensitive",
      label: "Sensitive",
      type: "checkbox",
      help: "Hide from the guide unless explicitly viewed.",
    },
  ];

  const instructionColumns: ColumnDef[] = [
    { key: "sort_order", label: "#" },
    { key: "category", label: "Category", variant: "badge" },
    { key: "title", label: "Title" },
    { key: "instruction", label: "Instruction", variant: "truncate" },
    { key: "sensitive", label: "Sensitive", variant: "boolean" },
  ];

  const siteProductFields: FieldDef[] = [
    {
      name: "product_id",
      label: "Product",
      type: "select",
      options: productOptions,
      required: true,
      createOnly: true,
    },
    {
      name: "minimum_quantity",
      label: "Minimum quantity",
      type: "number",
      step: "0.01",
      required: true,
    },
    { name: "unit_of_measure", label: "Unit of measure", required: true },
    { name: "order_multiple", label: "Order multiple", type: "number", step: "0.01" },
    { name: "notes", label: "Notes" },
  ];

  const siteProductColumns: ColumnDef[] = [
    {
      key: "product_id",
      label: "Product",
      variant: "lookup",
      lookup: productLabelLookup,
    },
    { key: "minimum_quantity", label: "Minimum" },
    { key: "unit_of_measure", label: "Unit" },
    { key: "order_multiple", label: "Order in multiples of" },
    { key: "notes", label: "Notes" },
  ];

  return (
    <div>
      <PageHeader
        title={siteData.site.name}
        description={siteData.site.address}
        actions={
          <Link
            href={`/customers/${customerId}`}
            className="rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-600 hover:bg-slate-100"
          >
            Back to customer
          </Link>
        }
      />

      <section className="mb-10">
        <h2 className="mb-3 text-xl text-slate-900">Site instructions</h2>
        {instructionsInitialLoading ? (
          <LoadingPage label="Loading instructions..." />
        ) : instructionsError && !instructionsData ? (
          <EmptyState message="Could not load instructions." />
        ) : (
        <EntityManager
          apiBase="/api/instructions"
          rows={instructionsData?.rows ?? []}
          columns={instructionColumns}
          fields={instructionFields}
          createLabel="Add instruction"
          emptyMessage="No instructions yet."
          hiddenFields={{ customer_id: customerId, site_id: siteId }}
          onMutate={reloadInstructions}
          refreshing={instructionsRefreshing}
          sort={{
            column: instructionsSort,
            dir: instructionsSortDir,
            onChange: setInstructionsSort,
          }}
          search={{
            value: instructionsSearch,
            onChange: setInstructionsSearch,
            placeholder: "Search instructions...",
          }}
          pagination={
            instructionsData
              ? {
                  page: instructionsData.page,
                  limit: instructionsData.limit,
                  total: instructionsData.total,
                  totalPages: instructionsData.totalPages,
                  onPageChange: setInstructionsPage,
                  onLimitChange: setInstructionsLimit,
                }
              : undefined
          }
        />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl text-slate-900">
          Products & minimums for this site
        </h2>
        {siteProductsInitialLoading ? (
          <LoadingPage label="Loading products..." />
        ) : siteProductsError && !siteProductsData ? (
          <EmptyState message="Could not load products." />
        ) : (
        <EntityManager
          apiBase="/api/site-products"
          rows={siteProductsData?.rows ?? []}
          columns={siteProductColumns}
          fields={siteProductFields}
          createLabel="Add product to site"
          emptyMessage="No products assigned to this site yet."
          hiddenFields={{ customer_id: customerId, site_id: siteId }}
          onMutate={reloadSiteProducts}
          refreshing={siteProductsRefreshing}
          sort={{
            column: productsSort,
            dir: productsSortDir,
            onChange: setProductsSort,
          }}
          search={{
            value: productsSearch,
            onChange: setProductsSearch,
            placeholder: "Search site products...",
          }}
          pagination={
            siteProductsData
              ? {
                  page: siteProductsData.page,
                  limit: siteProductsData.limit,
                  total: siteProductsData.total,
                  totalPages: siteProductsData.totalPages,
                  onPageChange: setProductsPage,
                  onLimitChange: setProductsLimit,
                }
              : undefined
          }
        />
        )}
      </section>
    </div>
  );
}
