import type { Metadata, Viewport } from "next";

import { AppToaster } from "@/components/app-toaster";
import { ThemeSync } from "@/components/theme-sync";
import { themeInitScript } from "@/lib/theme";

import "./globals.css";

export const metadata: Metadata = {
  title: "Foodcare Admin",
  description: "Manage sites, products, sales reps, and field orders",
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The inline script sets data-theme before the first paint, so React must keep what it finds.
    <html lang="en" data-theme="light" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans antialiased">
        {children}
        <ThemeSync />
        <AppToaster />
      </body>
    </html>
  );
}
