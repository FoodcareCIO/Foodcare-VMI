import type { ReactNode } from "react";

export type FieldVariant = "default" | "dark";

export const fieldLabelClasses: Record<FieldVariant, string> = {
  default: "text-slate-600",
  dark: "text-slate-300",
};

export const fieldControlClasses: Record<FieldVariant, string> = {
  default:
    "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-emerald-500",
  dark: "border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 focus:border-emerald-500",
};

export const prefixIconClasses: Record<FieldVariant, string> = {
  default: "text-slate-400",
  dark: "text-slate-500",
};

export const FieldLabel = ({
  label,
  required,
  variant,
  htmlFor,
}: {
  label: string;
  required?: boolean;
  variant: FieldVariant;
  htmlFor?: string;
}) => (
  <span className={`text-base font-medium ${fieldLabelClasses[variant]}`}>
    <label htmlFor={htmlFor}>{label}</label>
    {required ? <span className="text-red-500"> *</span> : null}
  </span>
);

export const FieldError = ({
  id,
  error,
  variant = "default",
}: {
  id?: string;
  error: string;
  variant?: FieldVariant;
}) => (
  <p
    id={id}
    className={`text-sm ${variant === "dark" ? "text-red-400" : "text-red-500"}`}
  >
    {error}
  </p>
);

export const FieldHelp = ({ help }: { help: ReactNode }) => (
  <p className="text-sm text-slate-400">{help}</p>
);

export const fieldErrorClasses = "border-red-400 focus:border-red-500";
