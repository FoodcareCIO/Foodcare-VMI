"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  MAX_LIMIT,
  type SortDir,
} from "@/lib/pagination";

type UseListPaginationOptions = {
  prefix?: string;
  defaultPage?: number;
  defaultLimit?: number;
  defaultSort?: string;
  defaultDir?: SortDir;
};

export function useListPagination(options: UseListPaginationOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pageKey = options.prefix ? `${options.prefix}_page` : "page";
  const limitKey = options.prefix ? `${options.prefix}_limit` : "limit";
  const sortKey = options.prefix ? `${options.prefix}_sort` : "sort";
  const dirKey = options.prefix ? `${options.prefix}_dir` : "dir";
  const searchKey = options.prefix ? `${options.prefix}_q` : "q";

  const page = useMemo(() => {
    const raw = Number(searchParams.get(pageKey) ?? options.defaultPage ?? DEFAULT_PAGE);
    return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : DEFAULT_PAGE;
  }, [options.defaultPage, pageKey, searchParams]);

  const limit = useMemo(() => {
    const raw = Number(searchParams.get(limitKey) ?? options.defaultLimit ?? DEFAULT_LIMIT);
    if (!Number.isFinite(raw) || raw < 1) return options.defaultLimit ?? DEFAULT_LIMIT;
    return Math.min(Math.floor(raw), MAX_LIMIT);
  }, [limitKey, options.defaultLimit, searchParams]);

  const sort = useMemo(
    () => searchParams.get(sortKey) ?? options.defaultSort ?? null,
    [options.defaultSort, searchParams, sortKey],
  );

  const sortDir = useMemo((): SortDir => {
    const raw = searchParams.get(dirKey) ?? options.defaultDir ?? "asc";
    return raw === "desc" ? "desc" : "asc";
  }, [dirKey, options.defaultDir, searchParams]);

  const search = useMemo(
    () => searchParams.get(searchKey) ?? "",
    [searchKey, searchParams],
  );

  const updateParams = useCallback(
    (next: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(next)) {
        params.set(key, value);
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setPage = useCallback(
    (nextPage: number) => {
      updateParams({ [pageKey]: String(Math.max(1, nextPage)) });
    },
    [pageKey, updateParams],
  );

  const setLimit = useCallback(
    (nextLimit: number) => {
      updateParams({
        [limitKey]: String(Math.max(1, Math.min(MAX_LIMIT, nextLimit))),
        [pageKey]: "1",
      });
    },
    [limitKey, pageKey, updateParams],
  );

  const setSort = useCallback(
    (column: string) => {
      const nextDir: SortDir =
        sort === column && sortDir === "asc" ? "desc" : "asc";
      updateParams({
        [sortKey]: column,
        [dirKey]: nextDir,
        [pageKey]: "1",
      });
    },
    [dirKey, pageKey, sort, sortDir, sortKey, updateParams],
  );

  const setSearch = useCallback(
    (nextSearch: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = nextSearch.trim();
      if (trimmed) {
        params.set(searchKey, trimmed);
      } else {
        params.delete(searchKey);
      }
      params.set(pageKey, "1");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pageKey, pathname, router, searchKey, searchParams],
  );

  return {
    page,
    limit,
    sort,
    sortDir,
    search,
    pageKey,
    limitKey,
    sortKey,
    dirKey,
    searchKey,
    setPage,
    setLimit,
    setSort,
    setSearch,
  };
}
