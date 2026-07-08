"use client";

import { Suspense } from "react";

import { AuthGuard } from "@/features/auth/auth-guard";
import { LoadingPage } from "@/components/ui";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <Suspense fallback={<LoadingPage label="Loading..." />}>{children}</Suspense>
    </AuthGuard>
  );
}
