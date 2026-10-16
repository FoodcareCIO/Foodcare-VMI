"use client";

import { useEffect, useMemo } from "react";

import { useListPagination } from "@/lib/api/use-list-pagination";
import { useApiQuery } from "@/lib/api/use-query";
import { buildApiPath } from "@/lib/pagination";
import type { PaginationMeta, SortDir } from "@/lib/pagination";

type UsePaginatedQueryOptions = {
  prefix?: string;
  defaultLimit?: number;
  defaultSort?: string;
  defaultDir?: SortDir;
  extraParams?: Record<string, string | number | undefined | null>;
};

export function usePaginatedQuery<T extends PaginationMeta>(
  basePath: string,
  options: UsePaginatedQueryOptions = {},
) {
  const {
    page,
    limit,
    sort,
    sortDir,
    search,
    setPage,
    setLimit,
    setSort,
    setSearch,
  } = useListPagination({
    prefix: options.prefix,
    defaultLimit: options.defaultLimit,
    defaultSort: options.defaultSort,
    defaultDir: options.defaultDir,
  });

  const path = buildApiPath(basePath, {
    ...options.extraParams,
    page,
    limit,
    sort: sort ?? undefined,
    dir: sortDir,
    q: search || undefined,
  });

  const { data, error, initialLoading, refreshing, reload } = useApiQuery<T>(path);

  useEffect(() => {
    if (!data || refreshing) return;
    if (data.totalPages > 0 && page > data.totalPages) {
      setPage(data.totalPages);
    }
  }, [data, page, refreshing, setPage]);

  // While the next page is loading, `data` is still the previous response. Report the
  // page and page size the user just picked, so the pagination controls change at once.
  const displayData = useMemo(
    () =>
      data
        ? ({
            ...data,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(data.total / limit)),
          } as T)
        : data,
    [data, limit, page],
  );

  return {
    data: displayData,
    error,
    initialLoading,
    refreshing,
    reload,
    page,
    limit,
    sort,
    sortDir,
    search,
    setPage,
    setLimit,
    setSort,
    setSearch,
  };
}
