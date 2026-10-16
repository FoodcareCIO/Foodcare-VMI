import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Icon, type IconSize } from "@/components/ui/icon";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "border border-primary bg-primary text-on-primary hover:bg-primary-hover hover:border-primary-hover",
  secondary: "border border-line-strong bg-surface text-fg hover:bg-subtle",
  ghost: "border border-transparent text-primary-text hover:bg-primary-soft",
  danger: "border border-transparent bg-danger-soft text-danger-text hover:border-danger",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 px-3 text-sm font-semibold",
  md: "h-10 gap-2 px-5 text-base font-bold",
  lg: "h-12 gap-2 px-6 text-base font-bold",
};

const iconSizes: Record<ButtonSize, IconSize> = {
  sm: "sm",
  md: "md",
  lg: "md",
};

/** Class names for anything that should look like a button (a real button or a link). */
export const buttonClasses = ({
  variant = "primary",
  size = "md",
  fullWidth = false,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
} = {}) =>
  `relative inline-flex items-center justify-center whitespace-nowrap rounded-full transition duration-150 active:scale-[0.97] ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? "w-full" : ""}`;

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
  const gap = size === "sm" ? "gap-1.5" : "gap-2";

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      className={`${buttonClasses({ variant, size, fullWidth })} ${loading ? "" : "disabled:opacity-45"} ${className}`}
      {...props}
    >
      <span className={`inline-flex items-center justify-center ${gap} ${loading ? "invisible" : ""}`}>
        {icon && iconPosition === "left" && <Icon icon={icon} size={iconSize} />}
        {children}
        {icon && iconPosition === "right" && <Icon icon={icon} size={iconSize} />}
      </span>

      {loading ? (
        <span className="absolute inset-0 flex items-center justify-center rounded-[inherit]">
          <Icon icon="mdi:loading" size={iconSize} className="animate-spin" />
        </span>
      ) : null}
    </button>
  );
};

export interface LinkButtonProps {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
  className?: string;
  children?: ReactNode;
}

/** A link that looks exactly like a Button, for actions that go to another page. */
export const LinkButton = ({
  href,
  variant = "secondary",
  size = "md",
  icon,
  iconPosition = "left",
  fullWidth = false,
  className = "",
  children,
}: LinkButtonProps) => {
  const iconSize = iconSizes[size];
  const gap = size === "sm" ? "gap-1.5" : "gap-2";

  return (
    <Link
      href={href}
      className={`${buttonClasses({ variant, size, fullWidth })} ${className}`}
    >
      <span className={`inline-flex items-center justify-center ${gap}`}>
        {icon && iconPosition === "left" && <Icon icon={icon} size={iconSize} />}
        {children}
        {icon && iconPosition === "right" && <Icon icon={icon} size={iconSize} />}
      </span>
    </Link>
  );
};
