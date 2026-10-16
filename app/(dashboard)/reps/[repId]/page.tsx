"use client";

import { use, useState } from "react";

import {
  Button,
  Card,
  EmptyState,
  LoadingPage,
  PageHeader,
  Pagination,
  SortableTableHeaderCell,
  Table,
  TableBodySection,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableSearch,
} from "@/components/ui";
import { api } from "@/lib/api/client";
import { usePaginatedQuery } from "@/lib/api/use-paginated-query";
import type { PaginatedSitesResponse } from "@/lib/pagination";
import { ASSIGNMENT_DEFAULT_SORT } from "@/lib/sort-config";

function AssignmentTableRow({
  repId,
  siteId,
  siteName,
  address,
  assigned,
  onMutate,
}: {
  repId: string;
  siteId: string;
  siteName: string;
  address: string;
  assigned: boolean;
  onMutate?: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    try {
      await api.put(`/api/reps/${repId}/assignments`, {
        site_id: siteId,
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
    <TableRow>
      <TableCell strong>{siteName}</TableCell>
      <TableCell muted>{address}</TableCell>
      <TableCell className="text-right">
        <Button
          variant={assigned ? "secondary" : "primary"}
          size="sm"
          loading={busy}
          icon={assigned ? "mdi:link-off" : "mdi:link-variant"}
          onClick={() => void toggle()}
        >
          {assigned ? "Unassign" : "Assign"}
        </Button>
      </TableCell>
    </TableRow>
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
  } = usePaginatedQuery<PaginatedSitesResponse>(`/api/reps/${repId}/assignments`, {
    defaultSort: ASSIGNMENT_DEFAULT_SORT,
  });

  if (initialLoading) return <LoadingPage label="Loading sites..." />;
  if (error && !data) return <EmptyState message="Could not load sites. Please try again." />;

  return (
    <div>
      <PageHeader
        back={{ href: "/reps", label: "Back to sales reps" }}
        title="Assign sites"
        description="Choose which sites this rep counts. They will see them in the app."
      />
      <div className="mb-4">
        <TableSearch
          value={search}
          onChange={setSearch}
          placeholder="Search sites"
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
                Site
              </SortableTableHeaderCell>
              <TableHeaderCell>Address</TableHeaderCell>
              <TableHeaderCell className="text-right">Assigned</TableHeaderCell>
            </TableHead>
            <tbody>
              {!data?.sites.length ? (
                <TableEmptyRow colSpan={3} message="There are no sites to add yet." />
              ) : (
                data.sites.map((site) => (
                  <AssignmentTableRow
                    key={site.id}
                    repId={repId}
                    siteId={site.id}
                    siteName={site.name}
                    address={site.address}
                    assigned={site.assigned}
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
