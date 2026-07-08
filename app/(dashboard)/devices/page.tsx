"use client";

import { DeviceRevokeButton } from "@/components/device-revoke-button";
import {
  Badge,
  Card,
  EmptyState,
  LoadingPage,
  PageHeader,
  Pagination,
  SortableTableHeaderCell,
  Table,
  TableBodySection,
  TableHead,
  TableHeaderCell,
  TableSearch,
  formatDate,
} from "@/components/ui";
import { usePaginatedQuery } from "@/lib/api/use-paginated-query";
import type { PaginatedDevicesResponse } from "@/lib/pagination";
import {
  DEVICE_DEFAULT_DIR,
  DEVICE_DEFAULT_SORT,
} from "@/lib/sort-config";

export default function DevicesPage() {
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
  } = usePaginatedQuery<PaginatedDevicesResponse>("/api/devices", {
    defaultSort: DEVICE_DEFAULT_SORT,
    defaultDir: DEVICE_DEFAULT_DIR,
  });

  if (initialLoading) return <LoadingPage label="Loading devices..." />;
  if (error && !data) return <EmptyState message="Could not load data. Please try again." />;

  const devices = data?.devices ?? [];

  return (
    <div>
      <PageHeader
        title="Devices"
        description="Mobile devices used by sales reps. Revoking signs the rep out."
      />
      <div className="mb-4">
        <TableSearch
          value={search}
          onChange={setSearch}
          placeholder="Search devices..."
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
                Device
              </SortableTableHeaderCell>
              <SortableTableHeaderCell
                sortKey="platform"
                activeSort={sort}
                activeDir={sortDir}
                onSort={setSort}
              >
                Type
              </SortableTableHeaderCell>
              <SortableTableHeaderCell
                sortKey="rep"
                activeSort={sort}
                activeDir={sortDir}
                onSort={setSort}
              >
                Rep
              </SortableTableHeaderCell>
              <SortableTableHeaderCell
                sortKey="last_seen_at"
                activeSort={sort}
                activeDir={sortDir}
                onSort={setSort}
              >
                Last seen
              </SortableTableHeaderCell>
              <SortableTableHeaderCell
                sortKey="status"
                activeSort={sort}
                activeDir={sortDir}
                onSort={setSort}
              >
                Status
              </SortableTableHeaderCell>
              <TableHeaderCell className="text-right">Actions</TableHeaderCell>
            </TableHead>
            <tbody>
              {devices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-base text-slate-400">
                    No devices registered yet.
                  </td>
                </tr>
              ) : (
                devices.map((device) => {
                  const users = device.users as {
                    display_name?: string;
                    email?: string;
                  } | null;
                  return (
                    <tr
                      key={String(device.id)}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {String(device.name ?? String(device.id).slice(0, 8))}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {String(device.platform ?? "-")}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {users?.display_name ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDate(device.last_seen_at as string)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge value={device.revoked_at ? "revoked" : "active"} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <DeviceRevokeButton
                            deviceId={String(device.id)}
                            revoked={Boolean(device.revoked_at)}
                            onMutate={reload}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
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
