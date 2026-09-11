import Link from "next/link";
import type { ReactNode } from "react";

import { Icon } from "@/components/ui/icon";

export const OverviewStatCard = ({
  label,
  value,
  icon,
  href,
  accent = "emerald",
}: {
  label: string;
  value: ReactNode;
  icon: string;
  href?: string;
  accent?: "emerald" | "sky" | "violet" | "amber" | "rose" | "slate";
}) => {
  const accents: Record<string, { icon: string; ring: string }> = {
    emerald: {
      icon: "bg-emerald-500 text-white",
      ring: "hover:border-emerald-200 hover:shadow-emerald-100/50",
    },
    sky: {
      icon: "bg-sky-500 text-white",
      ring: "hover:border-sky-200 hover:shadow-sky-100/50",
    },
    violet: {
      icon: "bg-violet-500 text-white",
      ring: "hover:border-violet-200 hover:shadow-violet-100/50",
    },
    amber: {
      icon: "bg-amber-500 text-white",
      ring: "hover:border-amber-200 hover:shadow-amber-100/50",
    },
    rose: {
      icon: "bg-rose-500 text-white",
      ring: "hover:border-rose-200 hover:shadow-rose-100/50",
    },
    slate: {
      icon: "bg-slate-700 text-white",
      ring: "hover:border-slate-200",
    },
  };

  const styles = accents[accent];

  const content = (
    <div
      className={`group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition ${styles.ring} ${href ? "cursor-pointer hover:shadow-md" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-3xl shadow-sm ${styles.icon}`}
        >
          <Icon icon={icon} width={20} height={20} />
        </div>
        {href ? (
          <Icon
            icon="mdi:arrow-top-right"
            width={16}
            height={16}
            className="text-slate-300 transition group-hover:text-emerald-500"
          />
        ) : null}
      </div>
      <p className="mt-4 text-base font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
};

export const OrderStatusChart = ({
  breakdown,
}: {
  breakdown: { draft: number; completed: number; rejected: number };
}) => {
  const total = breakdown.draft + breakdown.completed + breakdown.rejected;
  const segments = [
    { key: "completed", label: "Submitted", value: breakdown.completed, color: "#10b981", radius: 62 },
    { key: "draft", label: "In progress", value: breakdown.draft, color: "#f59e0b", radius: 47 },
    { key: "rejected", label: "Rejected", value: breakdown.rejected, color: "#ef4444", radius: 32 },
  ];

  if (total === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center text-base text-slate-400">
        <Icon icon="mdi:chart-donut" width={40} height={40} className="mb-2 opacity-40" />
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
                stroke="#f1f5f9"
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
                  stroke={segment.color}
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
          <span className="text-2xl font-semibold tracking-tight text-slate-900">{total}</span>
          <span className="text-sm text-slate-500">Total</span>
        </div>
      </div>

      <ul className="w-full max-w-xs space-y-4">
        {segments.map((segment) => {
          const pct = Math.round((segment.value / total) * 100);
          return (
            <li key={segment.key} className="flex items-center justify-between gap-8 text-base">
              <span className="flex items-center gap-2 text-slate-600">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                {segment.label}
              </span>
              <span className="font-medium text-slate-900">
                {segment.value}{" "}
                <span className="text-slate-400">({pct}%)</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export const CatalogBars = ({
  sites,
  products,
  reps,
}: {
  sites: number;
  products: number;
  reps: number;
}) => {
  const items = [
    { label: "Sites", value: sites, icon: "mdi:map-marker-outline", color: "bg-sky-500" },
    { label: "Products", value: products, icon: "mdi:package-variant", color: "bg-violet-500" },
    { label: "Sales reps", value: reps, icon: "mdi:account-group-outline", color: "bg-amber-500" },
  ];
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1.5 flex items-center justify-between gap-2 text-base">
            <span className="flex items-center gap-2 font-medium text-slate-700">
              <Icon icon={item.icon} width={16} height={16} className="text-slate-400" />
              {item.label}
            </span>
            <span className="font-semibold text-slate-900">{item.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${item.color} transition-all`}
              style={{ width: `${Math.max((item.value / max) * 100, item.value > 0 ? 8 : 0)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
};

