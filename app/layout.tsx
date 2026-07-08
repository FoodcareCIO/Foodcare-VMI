import type { Metadata } from "next";

import { AppToaster } from "@/components/app-toaster";

import "./globals.css";

export const metadata: Metadata = {
  title: "Foodcare Admin",
  description: "Manage customers, products, sales reps, and field orders",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col font-sans antialiased">
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
