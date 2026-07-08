"use client";

import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";

export const TableSearch = ({
  value,
  onChange,
  placeholder = "Search... (Press Enter)",
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) => {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const submit = () => {
    onChange(draft);
  };

  return (
    <Input
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          submit();
        }
      }}
      prefixIcon="mdi:magnify"
      placeholder={placeholder}
      disabled={disabled}
      aria-label="Search table"
      wrapperClassName="w-full max-w-sm"
    />
  );
};
