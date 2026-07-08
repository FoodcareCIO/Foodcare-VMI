"use client";

import {
  EntityManager,
  type ColumnDef,
  type FieldDef,
} from "@/components/entity-manager";
import { EmptyState, PageHeader, LoadingPage } from "@/components/ui";
import { usePaginatedQuery } from "@/lib/api/use-paginated-query";
import type { PaginatedRowsResponse } from "@/lib/pagination";
import { ADMIN_DEFAULT_SORT } from "@/lib/sort-config";

const roleOptions = [
  { value: "admin", label: "Admin" },
  { value: "owner", label: "Owner" },
  { value: "viewer", label: "Viewer" },
];

const fields: FieldDef[] = [
  {
    name: "email",
    label: "Email",
    type: "email",
    required: true,
    createOnly: true,
  },
  {
    name: "password",
    label: "Password (new accounts only)",
    type: "password",
    createOnly: true,
  },
  { name: "display_name", label: "Name" },
  { name: "role", label: "Role", type: "select", options: roleOptions },
];

const columns: ColumnDef[] = [
  { key: "display_name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "role", label: "Role" },
];

export default function AdminsPage() {
  const { data, error, initialLoading, refreshing, reload, setPage, setLimit, sort, sortDir, setSort, search, setSearch } =
    usePaginatedQuery<PaginatedRowsResponse>("/api/admins", {
      defaultSort: ADMIN_DEFAULT_SORT,
    });

  if (initialLoading) return <LoadingPage label="Loading admins..." />;
  if (error && !data) return <EmptyState message="Could not load data. Please try again." />;

  return (
    <div>
      <PageHeader
        title="Dashboard access"
        description="Manage who can sign in to this dashboard."
      />
      <EntityManager
        apiBase="/api/admins"
        rows={data?.rows ?? []}
        columns={columns}
        fields={fields}
        idKey="user_id"
        createLabel="Add admin"
        emptyMessage="No admins yet."
        onMutate={reload}
        refreshing={refreshing}
        sort={{ column: sort, dir: sortDir, onChange: setSort }}
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search admins...",
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
