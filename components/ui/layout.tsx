import type { ReactNode } from "react";

export const PageHeader = ({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) => (
  <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
    <div>
      <h1 className="text-3xl tracking-tight text-slate-900">{title}</h1>
      {description && (
        <p className="mt-2 max-w-2xl text-base font-normal leading-relaxed tracking-normal text-slate-500">
          {description}
        </p>
      )}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </header>
);

export const Card = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
  >
    {children}
  </div>
);

export const MetricCard = ({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-base font-medium text-slate-500">{label}</p>
    <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
  </div>
);

export const EmptyState = ({ message }: { message: string }) => (
  <div className="px-6 py-12 text-center text-base font-normal text-slate-400">{message}</div>
);

const badgeStyles: Record<string, string> = {
  draft: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  sent: "bg-emerald-100 text-emerald-700",
  generated: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
  not_requested: "bg-slate-100 text-slate-600",
  active: "bg-emerald-100 text-emerald-700",
  revoked: "bg-red-100 text-red-700",
  neutral: "bg-slate-100 text-slate-600",
};

const badgeLabels: Record<string, string> = {
  draft: "In progress",
  completed: "Submitted",
  rejected: "Rejected",
  sent: "Sent",
  generated: "Ready",
  pending: "Pending",
  failed: "Needs attention",
  not_requested: "Not created",
  active: "Active",
  revoked: "Revoked",
};

export const Badge = ({ value }: { value: string }) => {
  const style = badgeStyles[value] ?? badgeStyles.neutral;
  const label = badgeLabels[value] ?? value.replaceAll("_", " ");
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-sm font-medium ${style}`}
    >
      {label}
    </span>
  );
};

export const formatDate = (value: string | null | undefined): string => {
  if (!value) return "-";
  return new Date(value).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};
