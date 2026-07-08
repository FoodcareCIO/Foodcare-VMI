"use client";

import { useCallback, useMemo, useState } from "react";

import type { SortDir } from "@/lib/pagination";

type SortValue = string | number | boolean | null | undefined;

export function useClientTableSort<T>(
  rows: T[],
  accessors: Record<string, (row: T) => SortValue>,
  defaultSort: string,
  defaultDir: SortDir = "asc",
) {
  const [sort, setSortState] = useState<string | null>(defaultSort);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  const setSort = useCallback((column: string) => {
    setSortState((current) => {
      if (current === column) {
        setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
        return column;
      }
      setSortDir("asc");
      return column;
    });
  }, []);

  const sortedRows = useMemo(() => {
    const column = sort ?? defaultSort;
    const accessor = accessors[column];
    if (!accessor) return rows;

    const direction = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((left, right) => {
      const leftValue = accessor(left);
      const rightValue = accessor(right);

      if (leftValue == null && rightValue == null) return 0;
      if (leftValue == null) return 1;
      if (rightValue == null) return -1;

      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return (leftValue - rightValue) * direction;
      }

      return String(leftValue).localeCompare(String(rightValue), undefined, {
        numeric: true,
        sensitivity: "base",
      }) * direction;
    });
  }, [accessors, defaultSort, rows, sort, sortDir]);

  return { sortedRows, sort, sortDir, setSort };
}
