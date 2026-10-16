"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** A search box with a Search button. Pressing Enter works too. */
export const TableSearch = ({
  value,
  onChange,
  placeholder = "Search",
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

  return (
    <form
      role="search"
      className="flex w-full max-w-md items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onChange(draft);
      }}
    >
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        prefixIcon="mdi:magnify"
        placeholder={placeholder}
        disabled={disabled}
        aria-label={placeholder}
        wrapperClassName="min-w-0 flex-1"
      />
      <Button type="submit" variant="secondary" disabled={disabled}>
        Search
      </Button>
    </form>
  );
};
