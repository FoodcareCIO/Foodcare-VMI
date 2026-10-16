import Link from "next/link";
import type { ReactNode } from "react";

import { Icon } from "@/components/ui/icon";

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

/** "‹ Back to orders": a link to the page the user came from, shown above the page title. */
export const BackLink = ({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) => (
  <Link
    href={href}
    className="-ml-2 mb-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold text-primary-text transition hover:bg-primary-soft"
  >
    <Icon icon="mdi:arrow-left" size="sm" />
    {children}
  </Link>
);

/** Page title and one short sentence saying what the page is for. */
export const PageHeader = ({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) => (
  <header className="mb-6">
    {back ? <BackLink href={back.href}>{back.label}</BackLink> : null}
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-xl text-fg">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-base text-fg-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  </header>
);

/** A heading for one block of a page, with an optional note and buttons on the right. */
export const SectionHeader = ({
  title,
  description,
  icon,
  actions,
}: {
  title: string;
  description?: ReactNode;
  icon?: string;
  actions?: ReactNode;
}) => (
  <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
    <div className="min-w-0">
      <h2 className="flex items-center gap-2 text-lg text-fg">
        {icon ? <Icon icon={icon} size="lg" className="text-primary-text" /> : null}
        {title}
      </h2>
      {description ? <div className="mt-1 text-sm text-fg-muted">{description}</div> : null}
    </div>
    {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
  </div>
);

const cardPadding = { none: "", md: "p-5", lg: "p-6" } as const;

/** The standard container: white (or dark grey) with a thin border. No heavy shadows. */
export const Card = ({
  children,
  className = "",
  padding = "none",
}: {
  children: ReactNode;
  className?: string;
  padding?: keyof typeof cardPadding;
}) => (
  <div
    className={`rounded-2xl border border-line bg-surface ${cardPadding[padding]} ${className}`}
  >
    {children}
  </div>
);

/** One headline number with a label. Pass `href` to make the whole card a link. */
export const StatCard = ({
  label,
  value,
  icon,
  href,
  compact = false,
}: {
  label: string;
  value: ReactNode;
  icon?: string;
  href?: string;
  /** For words (a name, a date) instead of a number: smaller text. */
  compact?: boolean;
}) => {
  const content = (
    <div
      className={`group flex h-full items-start gap-4 rounded-2xl border border-line bg-surface p-5 transition ${href ? "hover:border-line-strong hover:bg-subtle/50" : ""}`}
    >
      {icon ? (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-text">
          <Icon icon={icon} size="lg" />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-fg-muted">{label}</p>
        <div
          className={`mt-0.5 text-fg ${compact ? "text-subhead font-semibold" : "text-2xl font-bold"}`}
        >
          {value}
        </div>
      </div>
      {href ? (
        <Icon
          icon="mdi:arrow-top-right"
          size="sm"
          className="text-fg-placeholder transition group-hover:text-primary-text"
        />
      ) : null}
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  ) : (
    content
  );
};

/** Shown when there is nothing to list, or when a page could not load. */
export const EmptyState = ({
  message,
  title,
  icon,
  action,
}: {
  message: string;
  title?: string;
  icon?: string;
  action?: ReactNode;
}) => (
  <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
    {icon ? (
      <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-subtle text-fg-muted">
        <Icon icon={icon} size="lg" />
      </span>
    ) : null}
    {title ? <p className="text-subhead font-semibold text-fg">{title}</p> : null}
    <p className="max-w-md text-base text-fg-muted">{message}</p>
    {action ? <div className="mt-2">{action}</div> : null}
  </div>
);

const alertTones: Record<Tone, { box: string; icon: string }> = {
  neutral: { box: "bg-subtle text-fg", icon: "mdi:information-outline" },
  info: { box: "bg-primary-soft text-primary-text", icon: "mdi:information-outline" },
  success: { box: "bg-success-soft text-success-text", icon: "mdi:check-circle-outline" },
  warning: { box: "bg-warning-soft text-warning-text", icon: "mdi:alert-outline" },
  danger: { box: "bg-danger-soft text-danger-text", icon: "mdi:alert-circle-outline" },
};

/** A colored message for anything the user should notice. Icon, color and words together, never color alone. */
export const Alert = ({
  tone = "info",
  title,
  children,
  icon,
  action,
  className = "",
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  icon?: string;
  action?: ReactNode;
  className?: string;
}) => (
  <div
    role={tone === "danger" || tone === "warning" ? "alert" : "status"}
    className={`flex flex-wrap items-start gap-x-3 gap-y-3 rounded-2xl px-4 py-3 ${alertTones[tone].box} ${className}`}
  >
    <Icon icon={icon ?? alertTones[tone].icon} size="lg" className="mt-px shrink-0" />
    <div className="min-w-0 flex-1 basis-48 text-base">
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={title ? "mt-0.5" : ""}>{children}</div> : null}
    </div>
    {/* On narrow screens the button drops under the message, lined up with the text. */}
    {action ? <div className="shrink-0 self-center max-sm:basis-full max-sm:pl-9">{action}</div> : null}
  </div>
);

/** Label and value pairs in two columns, such as "To: orders@…". */
export const DescriptionList = ({
  rows,
}: {
  rows: [label: string, value: ReactNode][];
}) => (
  <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2.5 text-base">
    {rows.map(([label, value]) => (
      <div key={label} className="contents">
        <dt className="text-fg-muted">{label}</dt>
        <dd className="wrap-break-word text-fg">{value}</dd>
      </div>
    ))}
  </dl>
);

const badgeTones: Record<Tone, { pill: string; dot: string }> = {
  neutral: { pill: "bg-subtle text-fg-muted", dot: "bg-fg-muted" },
  info: { pill: "bg-primary-soft text-primary-text", dot: "bg-accent" },
  success: { pill: "bg-success-soft text-success-text", dot: "bg-success" },
  warning: { pill: "bg-warning-soft text-warning-text", dot: "bg-warning" },
  danger: { pill: "bg-danger-soft text-danger-text", dot: "bg-danger" },
};

const statusTones: Record<string, Tone> = {
  draft: "warning",
  completed: "success",
  rejected: "danger",
  sent: "success",
  generated: "success",
  pending: "warning",
  failed: "danger",
  not_requested: "neutral",
  sending: "info",
  waiting_photos: "warning",
  not_sent: "neutral",
  active: "success",
  revoked: "danger",
};

const statusLabels: Record<string, string> = {
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

/** A short status in a colored pill, such as "Submitted". Known statuses get their color and wording automatically. */
export const Badge = ({
  value,
  label: labelOverride,
  tone,
}: {
  value: string;
  label?: string;
  tone?: Tone;
}) => {
  const resolved = badgeTones[tone ?? statusTones[value] ?? "neutral"];
  const label = labelOverride ?? statusLabels[value] ?? value.replaceAll("_", " ");
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${resolved.pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${resolved.dot}`} aria-hidden />
      <span className="first-letter:uppercase">{label}</span>
    </span>
  );
};

/** A small label without a status dot, such as a site name chip. */
export const Tag = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-center rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary-text">
    {children}
  </span>
);

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

/** Day-first date and 24-hour time, e.g. 15/10/2026 10:42. */
export const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return "-";
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const statTileTones: Record<Tone, string> = {
  neutral: "text-fg",
  info: "text-primary-text",
  success: "text-success-text",
  warning: "text-warning-text",
  danger: "text-danger-text",
};

/** A small centered number with a label under it, such as "Added 12". */
export const StatTile = ({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
}) => (
  <div className="rounded-xl border border-line p-3 text-center">
    <div className={`text-xl font-bold ${statTileTones[tone]}`}>{value}</div>
    <div className="text-sm text-fg-muted">{label}</div>
  </div>
);
