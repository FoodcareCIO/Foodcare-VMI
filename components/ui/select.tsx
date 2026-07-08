"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";

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

export interface SelectOption {
  value: string;
  label: string;
}

export type SelectOptionsInput =
  | SelectOption[]
  | string[]
  | Record<string, string>;

export interface SelectProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "value" | "onChange" | "defaultValue" | "required"
  > {
  name?: string;
  label?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: SelectOptionsInput;
  placeholder?: string;
  prefixIcon?: string;
  error?: string;
  help?: string;
  variant?: FieldVariant;
  wrapperClassName?: string;
  required?: boolean;
}

const normalizeOptions = (options: SelectOptionsInput): SelectOption[] => {
  if (Array.isArray(options)) {
    if (options.length === 0) return [];
    if (typeof options[0] === "string") {
      return (options as string[]).map((option) => ({
        value: option,
        label: option,
      }));
    }
    return options as SelectOption[];
  }

  return Object.entries(options).map(([value, label]) => ({ value, label }));
};

export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      name,
      label,
      value,
      defaultValue = "",
      onChange,
      options: optionsInput,
      placeholder = "Select...",
      prefixIcon,
      error,
      help,
      variant = "default",
      wrapperClassName = "",
      className = "",
      id,
      required,
      disabled,
      ...props
    },
    ref,
  ) => {
    const listId = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLUListElement>(null);
    const [mounted, setMounted] = useState(false);
    const [open, setOpen] = useState(false);
    const [internalValue, setInternalValue] = useState(defaultValue);
    const [menuStyle, setMenuStyle] = useState({ top: 0, left: 0, width: 0 });

    const options = normalizeOptions(optionsInput);
    const isControlled = value !== undefined;
    const selectedValue = isControlled ? value : internalValue;
    const fieldId = id ?? name;
    const selectedOption = options.find((option) => option.value === selectedValue);

    const setTriggerRef = (node: HTMLButtonElement | null) => {
      triggerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    };

    const updateMenuPosition = useCallback(() => {
      const trigger = triggerRef.current;
      const dropdown = dropdownRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const gap = 4;
      const estimatedItemHeight = 40;
      const menuPadding = 8;
      const maxMenuHeight = 240;
      const menuHeight =
        dropdown?.offsetHeight ??
        Math.min(
          options.length * estimatedItemHeight + menuPadding,
          maxMenuHeight,
        );

      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const spaceAbove = rect.top - gap;
      const openUpward = menuHeight > spaceBelow && spaceAbove > spaceBelow;

      setMenuStyle({
        top: openUpward
          ? Math.max(gap, rect.top - menuHeight - gap)
          : rect.bottom + gap,
        left: rect.left,
        width: rect.width,
      });
    }, [options.length]);

    const setValue = (next: string) => {
      if (!isControlled) setInternalValue(next);
      onChange?.(next);
      setOpen(false);
    };

    useEffect(() => {
      setMounted(true);
    }, []);

    useEffect(() => {
      if (!open) return;

      updateMenuPosition();
      const frame = requestAnimationFrame(() => updateMenuPosition());

      const onPointerDown = (event: MouseEvent) => {
        const target = event.target as Node;
        if (
          rootRef.current?.contains(target) ||
          dropdownRef.current?.contains(target)
        ) {
          return;
        }
        setOpen(false);
      };

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") setOpen(false);
      };

      const onLayoutChange = () => updateMenuPosition();

      document.addEventListener("mousedown", onPointerDown);
      document.addEventListener("keydown", onKeyDown);
      window.addEventListener("resize", onLayoutChange);
      window.addEventListener("scroll", onLayoutChange, true);

      return () => {
        cancelAnimationFrame(frame);
        document.removeEventListener("mousedown", onPointerDown);
        document.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("resize", onLayoutChange);
        window.removeEventListener("scroll", onLayoutChange, true);
      };
    }, [open, updateMenuPosition, options.length]);

    const dropdown =
      open && mounted ? (
        <ul
          ref={dropdownRef}
          id={listId}
          role="listbox"
          style={{
            position: "fixed",
            top: menuStyle.top,
            left: menuStyle.left,
            width: menuStyle.width,
            zIndex: 60,
          }}
          className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-base text-slate-400">No options</li>
          ) : (
            options.map((option) => {
              const active = option.value === selectedValue;
              return (
                <li key={option.value} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => setValue(option.value)}
                    className={`flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-base transition hover:bg-slate-50 ${
                      active
                        ? "bg-emerald-50 font-medium text-emerald-700"
                        : "text-slate-700"
                    }`}
                  >
                    <span>{option.label}</span>
                    {active ? (
                      <Icon icon="mdi:check" width={16} height={16} />
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null;

    return (
      <div ref={rootRef} className={`flex flex-col gap-1 ${wrapperClassName}`}>
        {name ? (
          <input
            type="hidden"
            name={name}
            value={selectedValue}
            required={required}
          />
        ) : null}

        {label ? (
          <FieldLabel
            label={label}
            required={required}
            variant={variant}
            htmlFor={fieldId}
          />
        ) : null}

        <div className="relative">
          <button
            ref={setTriggerRef}
            id={fieldId}
            type="button"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listId}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${fieldId}-error` : undefined}
            onClick={() => !disabled && setOpen((current) => !current)}
            className={`flex w-full cursor-pointer items-center rounded-lg border py-2 text-left text-base outline-none transition disabled:cursor-not-allowed disabled:opacity-60 ${fieldControlClasses[variant]} ${prefixIcon ? "pl-10" : "pl-3"} pr-10 ${error ? fieldErrorClasses : ""} ${className}`}
            {...props}
          >
            <span className={selectedOption ? "" : "text-slate-400"}>
              {selectedOption?.label ?? placeholder}
            </span>
          </button>

          {prefixIcon ? (
            <span
              className={`pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 ${prefixIconClasses[variant]}`}
            >
              <Icon icon={prefixIcon} width={18} height={18} />
            </span>
          ) : null}

          <span
            className={`pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 ${prefixIconClasses[variant]}`}
          >
            <Icon
              icon="mdi:chevron-down"
              width={18}
              height={18}
              className={`transition ${open ? "rotate-180" : ""}`}
            />
          </span>
        </div>

        {dropdown && mounted ? createPortal(dropdown, document.body) : null}

        {error ? (
          <FieldError id={`${fieldId}-error`} error={error} variant={variant} />
        ) : null}
        {help && !error ? <FieldHelp help={help} /> : null}
      </div>
    );
  },
);

Select.displayName = "Select";
