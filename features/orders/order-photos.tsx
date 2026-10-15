"use client";

import { Card, EmptyState, Icon } from "@/components/ui";

export interface OrderPhoto {
  id: string;
  mime_type: string;
  created_at: string;
  url: string | null;
}

export function OrderPhotos({
  photos,
  expected,
  received,
}: {
  photos: OrderPhoto[];
  expected: number | null;
  received: number;
}) {
  const missing = expected === null ? 0 : Math.max(expected - received, 0);
  const heading =
    expected === null
      ? `${received} photo${received === 1 ? "" : "s"} received`
      : `${received} of ${expected} photo${expected === 1 ? "" : "s"} received`;

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-xl text-slate-900">Photos</h2>
        {photos.length > 0 || missing > 0 ? (
          <span className={missing > 0 ? "font-medium text-amber-600" : "text-slate-500"}>{heading}</span>
        ) : null}
      </div>
      {missing > 0 ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
          {missing} photo{missing === 1 ? " has" : "s have"} not reached the office yet. They appear here once the
          tablet uploads them.
        </p>
      ) : null}
      {photos.length === 0 ? (
        missing > 0 ? null : <EmptyState message="No photos were added to this visit." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, index) =>
            !photo.url ? (
              <div
                key={photo.id}
                className="flex h-36 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-center text-sm text-slate-500"
              >
                Could not load this file.
              </div>
            ) : photo.mime_type === "application/pdf" ? (
              <a
                key={photo.id}
                href={photo.url}
                target="_blank"
                rel="noreferrer"
                className="flex h-36 flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
              >
                <Icon icon="mdi:file-pdf-box" width={36} height={36} />
                <span className="text-sm font-medium">PDF {index + 1}</span>
              </a>
            ) : (
              <a
                key={photo.id}
                href={photo.url}
                target="_blank"
                rel="noreferrer"
                title="Open full size"
                className="block overflow-hidden rounded-lg border border-slate-200 transition hover:border-emerald-300 hover:shadow-md"
              >
                {/* Signed storage URLs expire, so they are not run through next/image. */}
                <img src={photo.url} alt={`Visit photo ${index + 1}`} loading="lazy" className="h-36 w-full object-cover" />
              </a>
            ),
          )}
        </div>
      )}
    </Card>
  );
}
