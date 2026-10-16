"use client";

import { Icon } from "@/components/ui";
import type { ThemePreference } from "@/lib/theme";
import { setThemePreference, useThemePreference } from "@/lib/use-theme";

const options: { value: ThemePreference; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: "mdi:white-balance-sunny" },
  { value: "dark", label: "Dark", icon: "mdi:weather-night" },
  { value: "system", label: "Match my device", icon: "mdi:monitor" },
];

/** Three buttons: always light, always dark, or follow the device. */
export const ThemeToggle = () => {
  const preference = useThemePreference();

  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      className="flex items-center gap-1 rounded-full bg-subtle p-1"
    >
      {options.map((option) => {
        const selected = preference === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.label}
            title={option.label}
            onClick={() => setThemePreference(option.value)}
            className={`flex h-8 flex-1 items-center justify-center rounded-full transition ${
              selected
                ? "bg-surface text-primary-text"
                : "text-fg-muted hover:text-fg"
            }`}
          >
            <Icon icon={option.icon} />
          </button>
        );
      })}
    </div>
  );
};
