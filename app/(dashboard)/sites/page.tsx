"use client";

import { EntityManager, type ColumnDef, type FieldDef } from "@/components/entity-manager";
import { EmptyState, LoadingPage, PageHeader } from "@/components/ui";
import { usePaginatedQuery } from "@/lib/api/use-paginated-query";
import type { PaginatedRowsResponse } from "@/lib/pagination";
import { SITE_DEFAULT_SORT } from "@/lib/sort-config";

const fields: FieldDef[] = [
  { name: "name", label: "Site name", required: true },
  { name: "address", label: "Address", required: true },
];
const columns: ColumnDef[] = [
  { key: "name", label: "Site", variant: "link", hrefTemplate: "/sites/:id" },
  { key: "address", label: "Address" },
];

export default function SitesPage() {
  const query = usePaginatedQuery<PaginatedRowsResponse>("/api/sites", { defaultSort: SITE_DEFAULT_SORT });
  if (query.initialLoading) return <LoadingPage label="Loading sites..." />;
  if (query.error && !query.data) return <EmptyState message="Could not load sites. Please try again." />;
  return (
    <div>
      <PageHeader title="Sites" description="Manage each location, its contacts, instructions, products, and minimum stock." />
      <EntityManager
        apiBase="/api/sites"
        rows={query.data?.rows ?? []}
        columns={columns}
        fields={fields}
        createLabel="Add site"
        emptyMessage="No sites yet."
        linkActions={[{ label: "Manage", hrefTemplate: "/sites/:id" }]}
        onMutate={query.reload}
        refreshing={query.refreshing}
        sort={{ column: query.sort, dir: query.sortDir, onChange: query.setSort }}
        search={{ value: query.search, onChange: query.setSearch, placeholder: "Search sites..." }}
        pagination={query.data ? { page: query.data.page, limit: query.data.limit, total: query.data.total, totalPages: query.data.totalPages, onPageChange: query.setPage, onLimitChange: query.setLimit } : undefined}
      />
    </div>
  );
}
