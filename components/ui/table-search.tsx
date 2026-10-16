"use client";

import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";

/**
 * A search box that searches when Enter is pressed. While the typed text has
 * not been searched yet, a small "Enter" key hint shows inside the box.
 * Clearing the box and pressing Enter shows everything again.
 */
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
  const pending = draft.trim() !== value.trim();

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <div role="search" className="relative w-full max-w-sm">
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onChange(draft);
          }
        }}
        enterKeyHint="search"
        prefixIcon="mdi:magnify"
        placeholder={placeholder}
        disabled={disabled}
        aria-label={`${placeholder} (press Enter)`}
        className={pending ? "pr-20!" : ""}
      />
      {pending ? (
        <kbd
          aria-hidden
          className="animate-fade-in pointer-events-none absolute inset-y-0 right-3 my-auto flex h-6 items-center gap-1 rounded-md border border-line bg-subtle px-1.5 font-sans text-xs text-fg-muted"
        >
          Enter
          <Icon icon="mdi:keyboard-return" size="sm" />
        </kbd>
      ) : null}
    </div>
  );
};
