import type {
  ReactNode,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";

import { Icon } from "@/components/ui/icon";
import { Loading } from "@/components/ui/loading";
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
    className="animate-fade-in absolute inset-x-0 bottom-0 top-11 z-10 flex items-center justify-center bg-surface/75"
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
  // Wide tables scroll sideways inside their card on narrow screens instead of breaking the page.
  <div className={`relative overflow-x-auto ${className}`}>
    {loading ? <TableBodyOverlay /> : null}
    {children}
  </div>
);

export const TableHead = ({ children }: { children: ReactNode }) => (
  <thead>
    <tr className="border-b border-line bg-subtle text-left text-sm font-semibold text-fg-muted">
      {children}
    </tr>
  </thead>
);

export const TableHeaderCell = ({
  children,
  className = "",
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) => (
  <th className={`whitespace-nowrap px-4 py-3 font-semibold ${className}`} {...props}>
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
    <TableHeaderCell
      className={className}
      aria-sort={
        isActive ? (activeDir === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1.5 rounded-md text-left font-semibold transition hover:text-fg ${isActive ? "text-fg" : ""}`}
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
          size="sm"
          className={isActive ? "text-primary-text" : "text-fg-placeholder"}
        />
      </button>
    </TableHeaderCell>
  );
};

/** One row of a table. Highlights when hovered. */
export const TableRow = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <tr
    className={`border-b border-line transition-colors last:border-0 hover:bg-subtle/60 ${className}`}
  >
    {children}
  </tr>
);

/** One cell. `strong` for the main name in the row, `muted` for supporting details. */
export const TableCell = ({
  children,
  strong = false,
  muted = false,
  nowrap = false,
  className = "",
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & {
  strong?: boolean;
  muted?: boolean;
  /** Keep the content on one line, for dates and short codes. */
  nowrap?: boolean;
}) => (
  <td
    className={`px-4 py-3 ${nowrap ? "whitespace-nowrap" : ""} ${strong ? "font-semibold text-fg" : muted ? "text-fg-muted" : "text-fg"} ${className}`}
    {...props}
  >
    {children}
  </td>
);

/** The row shown when a table has nothing in it. */
export const TableEmptyRow = ({
  colSpan,
  message,
}: {
  colSpan: number;
  message: string;
}) => (
  <tr>
    <td colSpan={colSpan} className="px-6 py-12 text-center text-base text-fg-muted">
      {message}
    </td>
  </tr>
);

/** A small, dense table for previews inside dialogs. Scrolls when long and keeps its header visible. */
export const CompactTable = ({
  headers,
  children,
  className = "",
}: {
  headers: string[];
  children: ReactNode;
  className?: string;
}) => (
  <div className={`max-h-64 overflow-auto rounded-xl border border-line ${className}`}>
    <table className="w-full text-left text-sm">
      <thead className="sticky top-0 bg-subtle text-fg-muted">
        <tr>
          {headers.map((header, index) => (
            <th key={`${header}-${index}`} className="px-3 py-2 font-semibold">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

export const CompactRow = ({ children }: { children: ReactNode }) => (
  <tr className="border-t border-line align-top">{children}</tr>
);

export const CompactCell = ({
  children,
  strong = false,
  muted = false,
  className = "",
}: {
  children?: ReactNode;
  strong?: boolean;
  muted?: boolean;
  className?: string;
}) => (
  <td
    className={`px-3 py-2 ${strong ? "font-semibold text-fg" : muted ? "text-fg-muted" : "text-fg"} ${className}`}
  >
    {children}
  </td>
);
