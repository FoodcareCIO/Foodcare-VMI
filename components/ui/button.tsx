import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Icon } from "@/components/ui/icon";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:hover:bg-emerald-500",
  secondary:
    "bg-slate-900 text-white hover:bg-slate-700 disabled:hover:bg-slate-900",
  danger:
    "bg-red-600 text-white hover:bg-red-500 disabled:hover:bg-red-600",
  ghost:
    "text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:hover:bg-transparent",
  outline:
    "border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:hover:bg-transparent",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-5 py-2.5 text-base",
};

const contentGapClasses: Record<ButtonSize, string> = {
  sm: "gap-1.5",
  md: "gap-2",
  lg: "gap-2",
};

const iconSizes: Record<ButtonSize, number> = {
  sm: 14,
  md: 16,
  lg: 18,
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: string;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
  children?: ReactNode;
}

export const Button = ({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  iconPosition = "left",
  fullWidth = false,
  disabled,
  className = "",
  children,
  type = "button",
  ...props
}: ButtonProps) => {
  const isDisabled = disabled || loading;
  const iconSize = iconSizes[size];

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      className={`relative inline-flex items-center justify-center rounded-xl font-medium transition ${loading ? "cursor-wait" : isDisabled ? "cursor-not-allowed" : "cursor-pointer"} ${loading ? "" : "disabled:opacity-60"} ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      <span
        className={`inline-flex items-center justify-center ${contentGapClasses[size]} ${loading ? "invisible" : ""}`}
      >
        {icon && iconPosition === "left" && (
          <Icon icon={icon} width={iconSize} height={iconSize} />
        )}
        {children}
        {icon && iconPosition === "right" && (
          <Icon icon={icon} width={iconSize} height={iconSize} />
        )}
      </span>

      {loading ? (
        <span className="absolute inset-0 flex items-center justify-center rounded-[inherit]">
          <Icon
            icon="mdi:loading"
            width={iconSize}
            height={iconSize}
            className="animate-spin"
            aria-hidden
          />
        </span>
      ) : null}
    </button>
  );
};
