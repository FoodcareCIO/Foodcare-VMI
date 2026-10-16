"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

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

/** What the user has just chosen, before the address bar has caught up. */
type Pending = {
  page?: number;
  limit?: number;
  sort?: string;
  dir?: SortDir;
  search?: string;
};

/**
 * Page, page size, sort and search for a list, kept in the address bar so the
 * browser's back button and shared links work.
 *
 * The address bar updates a moment after a click, so the user's choice is also
 * held here at once. The screen reflects it immediately (the selected page and
 * page size change right away) and the data request starts straight away; the
 * held choice is dropped as soon as the address bar changes.
 */
export function useListPagination(options: UseListPaginationOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlKey = searchParams.toString();
  const [held, setHeld] = useState<{ urlKey: string; values: Pending }>({
    urlKey,
    values: {},
  });
  const pending: Pending = held.urlKey === urlKey ? held.values : {};

  const pageKey = options.prefix ? `${options.prefix}_page` : "page";
  const limitKey = options.prefix ? `${options.prefix}_limit` : "limit";
  const sortKey = options.prefix ? `${options.prefix}_sort` : "sort";
  const dirKey = options.prefix ? `${options.prefix}_dir` : "dir";
  const searchKey = options.prefix ? `${options.prefix}_q` : "q";

  const urlPage = useMemo(() => {
    const raw = Number(searchParams.get(pageKey) ?? options.defaultPage ?? DEFAULT_PAGE);
    return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : DEFAULT_PAGE;
  }, [options.defaultPage, pageKey, searchParams]);

  const urlLimit = useMemo(() => {
    const raw = Number(searchParams.get(limitKey) ?? options.defaultLimit ?? DEFAULT_LIMIT);
    if (!Number.isFinite(raw) || raw < 1) return options.defaultLimit ?? DEFAULT_LIMIT;
    return Math.min(Math.floor(raw), MAX_LIMIT);
  }, [limitKey, options.defaultLimit, searchParams]);

  const urlSort = searchParams.get(sortKey) ?? options.defaultSort ?? null;

  const urlDir = useMemo((): SortDir => {
    const raw = searchParams.get(dirKey) ?? options.defaultDir ?? "asc";
    return raw === "desc" ? "desc" : "asc";
  }, [dirKey, options.defaultDir, searchParams]);

  const urlSearch = searchParams.get(searchKey) ?? "";

  const page = pending.page ?? urlPage;
  const limit = pending.limit ?? urlLimit;
  const sort = pending.sort ?? urlSort;
  const sortDir = pending.dir ?? urlDir;
  const search = pending.search ?? urlSearch;

  /** Shows the choice on screen now, and writes it to the address bar. */
  const apply = useCallback(
    (next: Pending) => {
      const merged = { ...pending, ...next };
      const params = new URLSearchParams(urlKey);
      if (merged.page !== undefined) params.set(pageKey, String(merged.page));
      if (merged.limit !== undefined) params.set(limitKey, String(merged.limit));
      if (merged.sort !== undefined) params.set(sortKey, merged.sort);
      if (merged.dir !== undefined) params.set(dirKey, merged.dir);
      if (merged.search !== undefined) {
        if (merged.search) params.set(searchKey, merged.search);
        else params.delete(searchKey);
      }
      setHeld({ urlKey, values: merged });
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [dirKey, limitKey, pageKey, pathname, pending, router, searchKey, sortKey, urlKey],
  );

  const setPage = useCallback(
    (nextPage: number) => apply({ page: Math.max(1, nextPage) }),
    [apply],
  );

  const setLimit = useCallback(
    (nextLimit: number) =>
      apply({ limit: Math.max(1, Math.min(MAX_LIMIT, nextLimit)), page: 1 }),
    [apply],
  );

  const setSort = useCallback(
    (column: string) => {
      const nextDir: SortDir =
        sort === column && sortDir === "asc" ? "desc" : "asc";
      apply({ sort: column, dir: nextDir, page: 1 });
    },
    [apply, sort, sortDir],
  );

  const setSearch = useCallback(
    (nextSearch: string) => apply({ search: nextSearch.trim(), page: 1 }),
    [apply],
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
