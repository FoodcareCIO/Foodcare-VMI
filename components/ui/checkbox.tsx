"use client";

import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

import {
  FieldError,
  FieldHelp,
  FieldLabel,
} from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  label?: string;
  description?: ReactNode;
  error?: string;
  help?: ReactNode;
  wrapperClassName?: string;
  onChange?: (checked: boolean) => void;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      description,
      error,
      help,
      wrapperClassName = "",
      className = "",
      id,
      name,
      checked,
      defaultChecked,
      disabled,
      required,
      onChange,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const fieldId = id ?? name ?? generatedId;
    const [internalChecked, setInternalChecked] = useState(Boolean(defaultChecked));
    const isControlled = checked !== undefined;
    const isChecked = isControlled ? checked : internalChecked;
    const caption = description ?? help;

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) setInternalChecked(event.target.checked);
      onChange?.(event.target.checked);
    };

    return (
      <div className={`flex flex-col gap-1.5 ${wrapperClassName}`}>
        {label ? (
          <FieldLabel label={label} required={required} htmlFor={fieldId} />
        ) : null}

        <label
          htmlFor={fieldId}
          className={`group/checkbox inline-flex cursor-pointer items-start gap-3 ${disabled ? "cursor-not-allowed opacity-60" : ""} ${className}`}
        >
          <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
            <input
              ref={ref}
              id={fieldId}
              name={name}
              type="checkbox"
              {...(isControlled ? { checked } : { defaultChecked })}
              disabled={disabled}
              required={required}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${fieldId}-error` : undefined}
              onChange={handleChange}
              className="peer sr-only"
              {...props}
            />
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-md border transition ${
                error
                  ? "border-danger bg-surface"
                  : isChecked
                    ? "border-primary bg-primary text-on-primary"
                    : "border-line-strong bg-surface text-transparent group-hover/checkbox:border-accent"
              } peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40`}
            >
              <Icon icon="mdi:check" size="sm" />
            </span>
          </span>

          {caption ? (
            <span
              className={`min-w-0 flex-1 pt-px text-base ${
                error ? "text-danger-text" : "text-fg"
              }`}
            >
              {caption}
            </span>
          ) : null}
        </label>

        {error ? <FieldError id={`${fieldId}-error`} error={error} /> : null}
        {help && description && !error ? <FieldHelp help={help} /> : null}
      </div>
    );
  },
);

Checkbox.displayName = "Checkbox";
