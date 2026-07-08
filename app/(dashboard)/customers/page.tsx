"use client";

import {
  EntityManager,
  type ColumnDef,
  type FieldDef,
} from "@/components/entity-manager";
import { LoadingPage, PageHeader, EmptyState } from "@/components/ui";
import { usePaginatedQuery } from "@/lib/api/use-paginated-query";
import type { PaginatedRowsResponse } from "@/lib/pagination";
import { CUSTOMER_DEFAULT_SORT } from "@/lib/sort-config";

const fields: FieldDef[] = [
  { name: "name", label: "Customer name", required: true },
  { name: "account_code", label: "Account code", help: "Optional unique code." },
];

const columns: ColumnDef[] = [
  { key: "name", label: "Name", variant: "link", hrefTemplate: "/customers/:id" },
  { key: "account_code", label: "Account code" },
];

export default function CustomersPage() {
  const { data, error, initialLoading, refreshing, reload, setPage, setLimit, sort, sortDir, setSort, search, setSearch } =
    usePaginatedQuery<PaginatedRowsResponse>("/api/customers", {
      defaultSort: CUSTOMER_DEFAULT_SORT,
    });

  if (initialLoading) return <LoadingPage label="Loading customers..." />;
  if (error && !data) return <EmptyState message="Could not load data. Please try again." />;

  return (
    <div>
      <PageHeader
        title="Customers & Sites"
        description="Manage customer accounts. Open a customer to manage its sites, contacts, and instructions."
      />
      <EntityManager
        apiBase="/api/customers"
        rows={data?.rows ?? []}
        columns={columns}
        fields={fields}
        createLabel="Add customer"
        emptyMessage="No customers yet."
        linkActions={[{ label: "Manage", hrefTemplate: "/customers/:id" }]}
        onMutate={reload}
        refreshing={refreshing}
        sort={{ column: sort, dir: sortDir, onChange: setSort }}
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search customers...",
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
