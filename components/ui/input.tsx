"use client";

import {
  forwardRef,
  useState,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

import {
  FieldError,
  FieldHelp,
  FieldLabel,
  fieldControlClasses,
  fieldErrorClasses,
  prefixIconClasses,
} from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label?: string;
  prefixIcon?: string;
  error?: string;
  help?: string;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      prefixIcon,
      error,
      help,
      type = "text",
      className = "",
      wrapperClassName = "",
      id,
      required,
      disabled,
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id ?? props.name;
    const isPassword = type === "password";
    const resolvedType = isPassword && showPassword ? "text" : type;

    return (
      <div className={`flex flex-col gap-1.5 ${wrapperClassName}`}>
        {label ? (
          <FieldLabel label={label} required={required} htmlFor={inputId} />
        ) : null}

        <div className="relative">
          {prefixIcon ? (
            <span
              className={`pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 ${prefixIconClasses}`}
            >
              <Icon icon={prefixIcon} />
            </span>
          ) : null}

          <input
            ref={ref}
            id={inputId}
            type={resolvedType}
            required={required}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${inputId}-error` : undefined}
            className={`h-10 w-full rounded-xl border text-base outline-none transition disabled:cursor-not-allowed disabled:opacity-60 ${fieldControlClasses} ${prefixIcon ? "pl-11" : "pl-3.5"} ${isPassword ? "pr-11" : "pr-3.5"} ${error ? fieldErrorClasses : ""} ${className}`}
            {...props}
          />

          {isPassword ? (
            <button
              type="button"
              className={`absolute inset-y-0 right-0 flex items-center rounded-r-xl px-3.5 ${prefixIconClasses} transition hover:text-fg`}
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((value) => !value)}
            >
              <Icon icon={showPassword ? "mdi:eye-off-outline" : "mdi:eye-outline"} />
            </button>
          ) : null}
        </div>

        {error ? <FieldError id={`${inputId}-error`} error={error} /> : null}
        {help && !error ? <FieldHelp help={help} /> : null}
      </div>
    );
  },
);

Input.displayName = "Input";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  help?: string;
  wrapperClassName?: string;
}

export const Textarea = ({
  label,
  error,
  help,
  className = "",
  wrapperClassName = "",
  id,
  required,
  disabled,
  ...props
}: TextareaProps) => {
  const fieldId = id ?? props.name;

  return (
    <div className={`flex flex-col gap-1.5 ${wrapperClassName}`}>
      {label ? (
        <FieldLabel label={label} required={required} htmlFor={fieldId} />
      ) : null}
      <textarea
        id={fieldId}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={`w-full rounded-xl border px-3.5 py-2.5 text-base outline-none transition disabled:cursor-not-allowed disabled:opacity-60 ${fieldControlClasses} ${error ? fieldErrorClasses : ""} ${className}`}
        {...props}
      />
      {error ? <FieldError id={`${fieldId}-error`} error={error} /> : null}
      {help && !error ? <FieldHelp help={help} /> : null}
    </div>
  );
};
