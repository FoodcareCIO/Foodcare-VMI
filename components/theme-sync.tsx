"use client";

import { useEffect } from "react";

import { applyThemePreference, useThemePreference } from "@/lib/use-theme";

/** Keeps the page in step with the device's light/dark setting while "Auto" is chosen. */
export const ThemeSync = () => {
  const preference = useThemePreference();

  useEffect(() => {
    if (preference !== "system") return;
    const query = matchMedia("(prefers-color-scheme: dark)");
    const update = () => applyThemePreference("system");
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [preference]);

  return null;
};
