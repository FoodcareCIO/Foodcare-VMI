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
  type FieldVariant,
} from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  label?: string;
  description?: ReactNode;
  error?: string;
  help?: ReactNode;
  variant?: FieldVariant;
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
      variant = "default",
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
          <FieldLabel
            label={label}
            required={required}
            variant={variant}
            htmlFor={fieldId}
          />
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
                  ? "border-red-400 bg-white"
                  : isChecked
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-slate-300 bg-white text-transparent group-hover/checkbox:border-emerald-400 group-hover/checkbox:bg-slate-50"
              } peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500/40 peer-disabled:group-hover/checkbox:border-slate-300 peer-disabled:group-hover/checkbox:bg-white`}
            >
              <Icon icon="mdi:check" width={14} height={14} />
            </span>
          </span>

          {caption ? (
            <span
              className={`min-w-0 flex-1 pt-px text-base leading-5 transition ${
                error
                  ? "text-red-600"
                  : isChecked
                    ? "text-slate-800"
                    : "text-slate-600 group-hover/checkbox:text-slate-800"
              }`}
            >
              {caption}
            </span>
          ) : null}
        </label>

        {error ? (
          <FieldError id={`${fieldId}-error`} error={error} variant={variant} />
        ) : null}
        {help && description && !error ? <FieldHelp help={help} /> : null}
      </div>
    );
  },
);

Checkbox.displayName = "Checkbox";

/** @deprecated Use `Checkbox` instead. */
export const CheckboxField = Checkbox;
