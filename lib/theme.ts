// Light/dark theme: shared constants. The browser-side hooks are in lib/use-theme.ts.

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "foodcare-theme";

/**
 * Runs in <head>, before the first paint, so the page never flashes the wrong
 * theme. It reads the saved choice (default: follow the device) and sets
 * <html data-theme="light|dark">.
 */
export const themeInitScript = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");var d=p==="dark"||(p!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light")}catch(e){}})()`;
