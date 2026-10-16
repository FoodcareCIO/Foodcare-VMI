"use client";

import type { CSSProperties } from "react";
import { Toaster } from "sonner";

import { useResolvedTheme } from "@/lib/use-theme";

// Toasts use the same colors as the rest of the dashboard.
const toastColors = {
  "--normal-bg": "var(--surface)",
  "--normal-text": "var(--fg)",
  "--normal-border": "var(--line)",
  "--success-bg": "var(--success-soft)",
  "--success-text": "var(--success-text)",
  "--success-border": "var(--success)",
  "--error-bg": "var(--danger-soft)",
  "--error-text": "var(--danger-text)",
  "--error-border": "var(--danger)",
  "--warning-bg": "var(--warning-soft)",
  "--warning-text": "var(--warning-text)",
  "--warning-border": "var(--warning)",
  "--info-bg": "var(--primary-soft)",
  "--info-text": "var(--primary-text)",
  "--info-border": "var(--accent)",
} as CSSProperties;

export const AppToaster = () => {
  const theme = useResolvedTheme();
  return (
    <Toaster
      closeButton
      position="top-right"
      richColors
      theme={theme}
      style={toastColors}
      toastOptions={{ duration: 5000 }}
    />
  );
};
