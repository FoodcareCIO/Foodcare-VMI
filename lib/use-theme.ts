"use client";

import { useSyncExternalStore } from "react";

import {
  THEME_STORAGE_KEY,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

const CHANGE_EVENT = "foodcare-theme-change";

const readPreference = (): ThemePreference => {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
};

const prefersDark = () => matchMedia("(prefers-color-scheme: dark)").matches;

/** Sets <html data-theme> to match a preference. */
export const applyThemePreference = (preference: ThemePreference) => {
  const dark = preference === "dark" || (preference === "system" && prefersDark());
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
};

export const setThemePreference = (preference: ThemePreference) => {
  try {
    if (preference === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage can be blocked; the choice then lasts until the page is reloaded.
  }
  applyThemePreference(preference);
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

const subscribePreference = (notify: () => void) => {
  window.addEventListener(CHANGE_EVENT, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(CHANGE_EVENT, notify);
    window.removeEventListener("storage", notify);
  };
};

/** What the person picked: light, dark, or follow their device. */
export const useThemePreference = (): ThemePreference =>
  useSyncExternalStore(subscribePreference, readPreference, () => "system");

const subscribeResolved = (notify: () => void) => {
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
};

/** The theme actually showing right now. */
export const useResolvedTheme = (): ResolvedTheme =>
  useSyncExternalStore(
    subscribeResolved,
    () =>
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "dark"
        : "light",
    () => "light",
  );
