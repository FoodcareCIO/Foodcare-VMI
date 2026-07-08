"use client";

import Link from "next/link";
import { use, useState } from "react";

import {
  Button,
  Card,
  LoadingPage,
  PageHeader,
  EmptyState,
  Pagination,
  SortableTableHeaderCell,
  Table,
  TableBodySection,
  TableHead,
  TableHeaderCell,
  TableSearch,
} from "@/components/ui";
import { api } from "@/lib/api/client";
import { usePaginatedQuery } from "@/lib/api/use-paginated-query";
import type { PaginatedCustomersResponse } from "@/lib/pagination";
import { ASSIGNMENT_DEFAULT_SORT } from "@/lib/sort-config";

function AssignmentTableRow({
  repId,
  customerId,
  customerName,
  assigned,
  onMutate,
}: {
  repId: string;
  customerId: string;
  customerName: string;
  assigned: boolean;
  onMutate?: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    try {
      await api.put(`/api/reps/${repId}/assignments`, {
        customer_id: customerId,
        assigned: !assigned,
      });
      await onMutate?.();
    } catch {
      // API client shows a toast for backend errors.
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
      <td className="px-4 py-3 text-slate-700">{customerName}</td>
      <td className="px-4 py-3 text-right">
        <Button
          variant={assigned ? "outline" : "primary"}
          size="sm"
          loading={busy}
          icon={assigned ? "mdi:link-off" : "mdi:link-variant"}
          onClick={() => void toggle()}
        >
          {assigned ? "Unassign" : "Assign"}
        </Button>
      </td>
    </tr>
  );
}

export default function RepAssignmentsPage({
  params,
}: {
  params: Promise<{ repId: string }>;
}) {
  const { repId } = use(params);
  const {
    data,
    error,
    initialLoading,
    refreshing,
    reload,
    setPage,
    setLimit,
    sort,
    sortDir,
    setSort,
    search,
    setSearch,
  } = usePaginatedQuery<PaginatedCustomersResponse>(`/api/reps/${repId}/assignments`, {
    defaultSort: ASSIGNMENT_DEFAULT_SORT,
  });

  if (initialLoading) return <LoadingPage label="Loading assignments..." />;
  if (error && !data) return <EmptyState message="Could not load data. Please try again." />;

  return (
    <div>
      <PageHeader
        title="Rep assignments"
        description="Choose which customers this rep can work with."
        actions={
          <Link
            href="/reps"
            className="rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-600 hover:bg-slate-100"
          >
            Back to reps
          </Link>
        }
      />
      <div className="mb-4">
        <TableSearch
          value={search}
          onChange={setSearch}
          placeholder="Search customers..."
          disabled={refreshing}
        />
      </div>
      <Card className="overflow-hidden">
        <TableBodySection loading={refreshing}>
          <Table>
            <TableHead>
              <SortableTableHeaderCell
                sortKey="name"
                activeSort={sort}
                activeDir={sortDir}
                onSort={setSort}
              >
                Customer
              </SortableTableHeaderCell>
              <TableHeaderCell className="text-right">Assigned</TableHeaderCell>
            </TableHead>
            <tbody>
              {!data?.customers.length ? (
                <tr>
                  <td colSpan={2} className="px-6 py-12 text-center text-base text-slate-400">
                    No customers to assign.
                  </td>
                </tr>
              ) : (
                data.customers.map((customer) => (
                  <AssignmentTableRow
                    key={customer.id}
                    repId={repId}
                    customerId={customer.id}
                    customerName={customer.name}
                    assigned={customer.assigned}
                    onMutate={reload}
                  />
                ))
              )}
            </tbody>
          </Table>
        </TableBodySection>
        {data && data.total > 0 ? (
          <Pagination
            page={data.page}
            limit={data.limit}
            total={data.total}
            totalPages={data.totalPages}
            onPageChange={setPage}
            onLimitChange={setLimit}
            busy={refreshing}
          />
        ) : null}
      </Card>
    </div>
  );
}
