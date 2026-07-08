"use client";

import { Button, Select } from "@/components/ui";
import { DEFAULT_LIMIT } from "@/lib/pagination";

const PAGE_SIZE_OPTIONS = [
  { value: String(DEFAULT_LIMIT), label: `${DEFAULT_LIMIT} per page` },
  { value: "10", label: "10 per page" },
  { value: "50", label: "50 per page" },
  { value: "100", label: "100 per page" },
];

export const Pagination = ({
  page,
  limit = DEFAULT_LIMIT,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  busy = false,
}: {
  page: number;
  limit?: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  busy?: boolean;
}) => {
  if (total === 0) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 px-4 py-3">
      <p className="text-sm text-slate-500">
        Showing {start}–{end} of {total}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {onLimitChange ? (
          <div className="w-36">
            <Select
              value={String(limit)}
              options={PAGE_SIZE_OPTIONS}
              onChange={(value) => onLimitChange(Number(value))}
              aria-label="Items per page"
              disabled={busy}
            />
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon="mdi:chevron-left"
            disabled={busy || page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <span className="min-w-24 text-center text-sm text-slate-600">
            Page {page} of {Math.max(totalPages, 1)}
          </span>
          <Button
            variant="outline"
            size="sm"
            icon="mdi:chevron-right"
            iconPosition="right"
            disabled={busy || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};
