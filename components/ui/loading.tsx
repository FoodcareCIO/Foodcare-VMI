import { Icon, type IconSize } from "@/components/ui/icon";

type LoadingSize = "sm" | "md" | "lg";

const sizeMap: Record<LoadingSize, IconSize> = {
  sm: "sm",
  md: "md",
  lg: "lg",
};

export const Loading = ({
  size = "md",
  label,
  className = "",
}: {
  size?: LoadingSize;
  label?: string;
  className?: string;
}) => (
  <span
    className={`inline-flex items-center gap-2 text-fg-muted ${className}`}
    role="status"
    aria-live="polite"
  >
    <Icon icon="mdi:loading" size={sizeMap[size]} className="animate-spin text-accent" />
    {label ? <span className="text-base">{label}</span> : null}
  </span>
);

/** A softly pulsing placeholder block, shown while the real content is loading. */
export const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-lg bg-subtle ${className}`} />
);

/**
 * Shown while a whole page loads: the outline of a page (title, a card of
 * rows) pulses in place, so the screen does not jump when the data arrives.
 * It fades in after a moment, so quick loads never flash.
 */
export const LoadingPage = ({
  label = "Loading...",
  className = "",
}: {
  label?: string;
  className?: string;
}) => (
  <div
    className={`animate-fade-in [animation-delay:150ms] ${className}`}
    role="status"
    aria-live="polite"
    aria-label={label}
  >
    <Skeleton className="mb-3 h-7 w-48" />
    <Skeleton className="mb-8 h-4 w-80 max-w-full" />
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="space-y-4">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex items-center gap-4">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    </div>
    <p className="mt-4 text-center text-sm text-fg-muted">{label}</p>
  </div>
);

