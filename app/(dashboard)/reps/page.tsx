"use client";

import {
  EntityManager,
  type ColumnDef,
  type FieldDef,
} from "@/components/entity-manager";
import { LoadingPage, PageHeader, EmptyState } from "@/components/ui";
import { usePaginatedQuery } from "@/lib/api/use-paginated-query";
import type { PaginatedRowsResponse } from "@/lib/pagination";
import { REP_DEFAULT_SORT } from "@/lib/sort-config";

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
    label: "Temporary password",
    type: "password",
    required: true,
    createOnly: true,
  },
  { name: "display_name", label: "Name", required: true },
  { name: "employee_code", label: "Employee code" },
];

const columns: ColumnDef[] = [
  { key: "display_name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "employee_code", label: "Employee code" },
];

export default function RepsPage() {
  const { data, error, initialLoading, refreshing, reload, setPage, setLimit, sort, sortDir, setSort, search, setSearch } =
    usePaginatedQuery<PaginatedRowsResponse>("/api/reps", {
      defaultSort: REP_DEFAULT_SORT,
    });

  if (initialLoading) return <LoadingPage label="Loading reps..." />;
  if (error && !data) return <EmptyState message="Could not load data. Please try again." />;

  return (
    <div>
      <PageHeader
        title="Reps & Assignments"
        description="Create sales rep accounts and choose which customers each rep can see."
      />
      <EntityManager
        apiBase="/api/reps"
        rows={data?.rows ?? []}
        columns={columns}
        fields={fields}
        createLabel="Add rep"
        emptyMessage="No reps yet."
        linkActions={[{ label: "Assignments", hrefTemplate: "/reps/:id" }]}
        onMutate={reload}
        refreshing={refreshing}
        sort={{ column: sort, dir: sortDir, onChange: setSort }}
        search={{
          value: search,
          onChange: setSearch,
          placeholder: "Search reps...",
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
