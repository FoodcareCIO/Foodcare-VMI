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
  type FieldVariant,
} from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";

export type { FieldVariant };

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label?: string;
  prefixIcon?: string;
  error?: string;
  help?: string;
  variant?: FieldVariant;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      prefixIcon,
      error,
      help,
      variant = "default",
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
      <div className={`flex flex-col gap-1 ${wrapperClassName}`}>
        {label ? (
          <FieldLabel
            label={label}
            required={required}
            variant={variant}
            htmlFor={inputId}
          />
        ) : null}

        <div className="relative">
          {prefixIcon ? (
            <span
              className={`pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 ${prefixIconClasses[variant]}`}
            >
              <Icon icon={prefixIcon} width={18} height={18} />
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
            className={`w-full rounded-lg border py-2 text-base outline-none transition disabled:cursor-not-allowed disabled:opacity-60 ${fieldControlClasses[variant]} ${prefixIcon ? "pl-10" : "px-3"} ${isPassword ? "pr-10" : prefixIcon ? "pr-3" : ""} ${error ? fieldErrorClasses : ""} ${className}`}
            {...props}
          />

          {isPassword ? (
            <button
              type="button"
              className={`absolute inset-y-0 right-0 flex cursor-pointer items-center px-2.5 ${prefixIconClasses[variant]} transition hover:opacity-80`}
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((value) => !value)}
              tabIndex={-1}
            >
              <Icon
                icon={showPassword ? "mdi:eye-off-outline" : "mdi:eye-outline"}
                width={18}
                height={18}
              />
            </button>
          ) : null}
        </div>

        {error ? (
          <FieldError id={`${inputId}-error`} error={error} variant={variant} />
        ) : null}
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
  variant?: FieldVariant;
  wrapperClassName?: string;
}

export const Textarea = ({
  label,
  error,
  help,
  variant = "default",
  className = "",
  wrapperClassName = "",
  id,
  required,
  disabled,
  ...props
}: TextareaProps) => {
  const fieldId = id ?? props.name;

  return (
    <div className={`flex flex-col gap-1 ${wrapperClassName}`}>
      {label ? (
        <FieldLabel
          label={label}
          required={required}
          variant={variant}
          htmlFor={fieldId}
        />
      ) : null}
      <textarea
        id={fieldId}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={`w-full rounded-lg border px-3 py-2 text-base outline-none transition disabled:cursor-not-allowed disabled:opacity-60 ${fieldControlClasses[variant]} ${error ? fieldErrorClasses : ""} ${className}`}
        {...props}
      />
      {error ? (
        <FieldError id={`${fieldId}-error`} error={error} variant={variant} />
      ) : null}
      {help && !error ? <FieldHelp help={help} /> : null}
    </div>
  );
};
