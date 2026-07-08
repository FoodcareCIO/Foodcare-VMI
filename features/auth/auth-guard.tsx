"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Sidebar } from "@/components/sidebar";
import { LoadingPage } from "@/components/ui";
import { api } from "@/lib/api/client";
import type { AdminSession } from "@/lib/auth";

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<AdminSession>("/api/auth/session", { silent: true })
      .then(setSession)
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingPage label="Please wait..." />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="h-screen overflow-hidden bg-slate-50">
      <Sidebar email={session.email} />
      <main className="ml-64 h-screen overflow-y-auto p-8">{children}</main>
    </div>
  );
};
