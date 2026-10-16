import { Icon } from "@/components/ui";

/** Donut chart of orders by status: submitted, in progress and rejected. */
export const OrderStatusChart = ({
  breakdown,
}: {
  breakdown: { draft: number; completed: number; rejected: number };
}) => {
  const total = breakdown.draft + breakdown.completed + breakdown.rejected;
  const segments = [
    { key: "completed", label: "Submitted", value: breakdown.completed, color: "var(--success)", radius: 62 },
    { key: "draft", label: "In progress", value: breakdown.draft, color: "var(--warning)", radius: 47 },
    { key: "rejected", label: "Rejected", value: breakdown.rejected, color: "var(--danger)", radius: 32 },
  ];

  if (total === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 text-base text-fg-muted">
        <Icon icon="mdi:chart-donut" size="xl" className="opacity-50" />
        No orders yet
      </div>
    );
  }

  const chartSegments = segments.map((segment) => {
    const circumference = 2 * Math.PI * segment.radius;
    const arcLength = circumference * 0.75;
    const percentage = segment.value / total;
    const dashLength = arcLength * percentage;

    return {
      ...segment,
      circumference,
      arcLength,
      dashLength,
      dashOffset: -(arcLength - dashLength),
    };
  });

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
      <div className="relative h-52 w-52 shrink-0">
        <svg
          viewBox="0 0 160 160"
          className="h-full w-full overflow-visible"
          role="img"
          aria-label={`Order status: ${breakdown.completed} submitted, ${breakdown.draft} in progress, ${breakdown.rejected} rejected`}
        >
          {chartSegments.map((segment) => (
            <g key={segment.key} transform="rotate(180 80 80)">
              <circle
                cx="80"
                cy="80"
                r={segment.radius}
                fill="none"
                style={{ stroke: "var(--surface-muted)" }}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${segment.arcLength} ${segment.circumference - segment.arcLength}`}
              />
              {segment.value > 0 ? (
                <circle
                  cx="80"
                  cy="80"
                  r={segment.radius}
                  fill="none"
                  style={{ stroke: segment.color }}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${segment.dashLength} ${segment.circumference - segment.dashLength}`}
                  strokeDashoffset={segment.dashOffset}
                  className="transition-all duration-700 ease-out"
                />
              ) : null}
            </g>
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold text-fg">{total}</span>
          <span className="text-sm text-fg-muted">Orders</span>
        </div>
      </div>

      <ul className="w-full max-w-xs space-y-4">
        {segments.map((segment) => {
          const pct = Math.round((segment.value / total) * 100);
          return (
            <li key={segment.key} className="flex items-center justify-between gap-8 text-base">
              <span className="flex items-center gap-2 text-fg-muted">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                {segment.label}
              </span>
              <span className="font-medium text-fg">
                {segment.value}{" "}
                <span className="font-normal text-fg-muted">({pct}%)</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
