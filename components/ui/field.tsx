import type { ReactNode } from "react";

/** Shared look of every form control, so inputs, selects and text areas match. */
export const fieldControlClasses =
  "border-line-strong bg-surface text-fg placeholder:text-fg-placeholder focus:border-accent focus:ring-2 focus:ring-accent/30";

export const fieldErrorClasses =
  "border-danger focus:border-danger focus:ring-danger/30";

export const prefixIconClasses = "text-fg-muted";

export const FieldLabel = ({
  label,
  required,
  htmlFor,
}: {
  label: string;
  required?: boolean;
  htmlFor?: string;
}) => (
  <span className="text-sm font-medium text-fg">
    <label htmlFor={htmlFor}>{label}</label>
    {required ? <span className="text-danger-text"> *</span> : null}
  </span>
);

export const FieldError = ({ id, error }: { id?: string; error: string }) => (
  <p id={id} role="alert" className="text-xs text-danger-text">
    {error}
  </p>
);

export const FieldHelp = ({ help }: { help: ReactNode }) => (
  <p className="text-xs text-fg-muted">{help}</p>
);
