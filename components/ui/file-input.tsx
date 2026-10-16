"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

import { FieldHelp, FieldLabel } from "@/components/ui/field";

export interface FileInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  label?: string;
  help?: string;
  onFile: (file: File | undefined) => void;
}

/** A "Choose file" box. Calls `onFile` with the chosen file, or undefined when it is cleared. */
export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(
  ({ label, help, onFile, id, className = "", ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label ? <FieldLabel label={label} htmlFor={id} /> : null}
      <input
        ref={ref}
        id={id}
        type="file"
        onChange={(event) => onFile(event.target.files?.[0])}
        className={`block w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm text-fg file:mr-3 file:rounded-full file:border-0 file:bg-subtle file:px-4 file:py-1.5 file:text-sm file:font-semibold file:text-fg hover:file:bg-line disabled:opacity-60 ${className}`}
        {...props}
      />
      {help ? <FieldHelp help={help} /> : null}
    </div>
  ),
);

FileInput.displayName = "FileInput";
