"use client";

import { Alert, Card, EmptyState, Icon, SectionHeader } from "@/components/ui";

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
    <Card padding="md">
      <SectionHeader
        title="Photos"
        icon="mdi:image-multiple-outline"
        actions={
          photos.length > 0 || missing > 0 ? (
            <span className={`text-sm ${missing > 0 ? "font-medium text-warning-text" : "text-fg-muted"}`}>
              {heading}
            </span>
          ) : null
        }
      />
      {missing > 0 ? (
        <Alert tone="warning" className="mb-4">
          {missing} photo{missing === 1 ? " has" : "s have"} not reached the office yet. They will appear here once the
          tablet uploads them.
        </Alert>
      ) : null}
      {photos.length === 0 ? (
        missing > 0 ? null : <EmptyState message="No photos were added to this visit." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((photo, index) =>
            !photo.url ? (
              <div
                key={photo.id}
                className="flex h-36 items-center justify-center rounded-xl border border-line bg-subtle px-3 text-center text-sm text-fg-muted"
              >
                Could not load this file.
              </div>
            ) : photo.mime_type === "application/pdf" ? (
              <a
                key={photo.id}
                href={photo.url}
                target="_blank"
                rel="noreferrer"
                className="flex h-36 flex-col items-center justify-center gap-2 rounded-xl border border-line bg-subtle text-fg-muted transition hover:border-accent hover:text-primary-text"
              >
                <Icon icon="mdi:file-pdf-box" size="xl" />
                <span className="text-sm font-medium">PDF {index + 1}</span>
              </a>
            ) : (
              <a
                key={photo.id}
                href={photo.url}
                target="_blank"
                rel="noreferrer"
                title="Open full size"
                className="block overflow-hidden rounded-xl border border-line transition hover:border-accent"
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
