import type { ReactNode } from "react";

import { Icon } from "@/components/ui/icon";

type LoadingSize = "sm" | "md" | "lg";

const sizeMap: Record<LoadingSize, number> = {
  sm: 16,
  md: 24,
  lg: 32,
};

export const Loading = ({
  size = "md",
  label,
  className = "",
}: {
  size?: LoadingSize;
  label?: string;
  className?: string;
}) => {
  const dimension = sizeMap[size];

  return (
    <span
      className={`inline-flex items-center gap-2 text-slate-500 ${className}`}
      role="status"
      aria-live="polite"
    >
      <Icon
        icon="mdi:loading"
        width={dimension}
        height={dimension}
        className="animate-spin text-emerald-500"
      />
      {label ? <span className="text-base">{label}</span> : null}
    </span>
  );
};

export const LoadingPage = ({
  label = "Loading...",
  className = "",
}: {
  label?: string;
  className?: string;
}) => (
  <div
    className={`flex min-h-48 flex-col items-center justify-center gap-3 ${className}`}
  >
    <Loading size="lg" />
    <p className="text-base text-slate-500">{label}</p>
  </div>
);

export const InlineLoadingOverlay = ({ label }: { label?: string }) => (
  <div
    className="absolute inset-0 z-10 flex items-center justify-center bg-white/75 backdrop-blur-[1px]"
    role="status"
    aria-live="polite"
  >
    <Loading size="md" label={label ?? "Loading..."} />
  </div>
);

export const LoadingOverlay = ({
  label,
  children,
}: {
  label?: string;
  children?: ReactNode;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[1px]">
    <div className="rounded-xl bg-white px-6 py-5 shadow-xl">
      <Loading size="lg" label={label ?? "Please wait..."} />
      {children}
    </div>
  </div>
);
