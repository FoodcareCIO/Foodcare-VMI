import type { ReactNode, ThHTMLAttributes } from "react";

import { Loading } from "@/components/ui/loading";
import { Icon } from "@/components/ui/icon";
import type { SortDir } from "@/lib/pagination";

export const Table = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => <table className={`w-full text-base ${className}`}>{children}</table>;

export const TableBodyOverlay = ({ label }: { label?: string }) => (
  <div
    className="absolute inset-x-0 bottom-0 top-[3.25rem] z-10 flex items-center justify-center bg-white/75 backdrop-blur-[1px]"
    role="status"
    aria-live="polite"
  >
    <Loading size="md" label={label ?? "Loading..."} />
  </div>
);

export const TableBodySection = ({
  loading = false,
  children,
  className = "",
}: {
  loading?: boolean;
  children: ReactNode;
  className?: string;
}) => (
  <div className={`relative ${className}`}>
    {loading ? <TableBodyOverlay /> : null}
    {children}
  </div>
);

export const TableHead = ({ children }: { children: ReactNode }) => (
  <thead>
    <tr className="border-b border-slate-200 text-left text-base font-medium text-slate-600">
      {children}
    </tr>
  </thead>
);

export const TableHeaderCell = ({
  children,
  className = "",
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={`px-4 py-3 pt-5 text-base ${className}`} {...props}>
    {children}
  </th>
);

export const SortableTableHeaderCell = ({
  children,
  sortKey,
  activeSort,
  activeDir,
  onSort,
  className = "",
}: {
  children: ReactNode;
  sortKey: string;
  activeSort: string | null;
  activeDir: SortDir;
  onSort: (key: string) => void;
  className?: string;
}) => {
  const isActive = activeSort === sortKey;

  return (
    <TableHeaderCell className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1.5 rounded-md py-0.5 text-left font-medium text-slate-600 transition hover:text-slate-900"
        aria-sort={
          isActive ? (activeDir === "asc" ? "ascending" : "descending") : "none"
        }
      >
        <span>{children}</span>
        <Icon
          icon={
            isActive
              ? activeDir === "asc"
                ? "mdi:arrow-up"
                : "mdi:arrow-down"
              : "mdi:unfold-more-horizontal"
          }
          width={16}
          height={16}
          className={isActive ? "text-emerald-600" : "text-slate-300"}
        />
      </button>
    </TableHeaderCell>
  );
};
