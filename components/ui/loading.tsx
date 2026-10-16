import { FoodcareLogo } from "@/components/foodcare-logo";

/** Three dots that swell one after another. Used while a table loads. */
export const ThreeDots = ({ label = "Loading" }: { label?: string }) => (
  <span className="inline-flex items-center gap-2" role="status" aria-live="polite">
    {[0, 1, 2].map((index) => (
      <span
        key={index}
        className="animate-dot-bounce h-3 w-3 rounded-full bg-accent"
        style={{ animationDelay: `${index * 160}ms` }}
        aria-hidden
      />
    ))}
    <span className="sr-only">{label}</span>
  </span>
);

/** The Foodcare logo with a ring turning around it. */
export const LogoLoader = ({
  label,
  size = 88,
}: {
  label?: string;
  /** Width of the whole loader in px; the logo takes about half. */
  size?: number;
}) => (
  <div
    className="relative flex flex-col items-center"
    role="status"
    aria-live="polite"
    aria-label={label ?? "Loading"}
  >
    <div className="relative" style={{ height: size, width: size }}>
      <FoodcareLogo
        size={Math.round(size * 0.5)}
        className="absolute inset-0 m-auto"
      />
      {/* A faint full ring with one bright arc that spins around it. */}
      <span
        className="absolute inset-0 rounded-full border-[3px] border-line"
        aria-hidden
      />
      <span
        className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-accent [animation-duration:1s]"
        aria-hidden
      />
    </div>
    {/* Hangs below the ring without taking space, so the logo stays exactly in the middle. */}
    {label ? (
      <p className="absolute top-full mt-4 whitespace-nowrap text-sm text-fg-muted">
        {label}
      </p>
    ) : null}
  </div>
);

/**
 * Shown while a page loads, centered in the visible area beside the menu. It
 * fades in after a moment, so quick loads never flash. Pass `compact` for a
 * block that loads inside a page or a dialog, where it only needs a small area.
 */
export const LoadingPage = ({
  label = "Loading...",
  className = "",
  compact = false,
}: {
  label?: string;
  className?: string;
  compact?: boolean;
}) => (
  <div
    className={`animate-fade-in flex items-center justify-center [animation-delay:150ms] ${
      // Fills exactly the space left by the page's own padding (more at the top on phones, for the top bar),
      // and on desktop is nudged so the logo sits at the true middle of the screen.
      compact ? "min-h-56" : "min-h-[calc(100dvh-7.5rem)] lg:min-h-[calc(100dvh-5rem)] lg:translate-y-2"
    } ${className}`}
  >
    <LogoLoader label={label} />
  </div>
);
