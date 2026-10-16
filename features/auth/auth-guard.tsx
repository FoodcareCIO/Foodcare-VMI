"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Sidebar } from "@/components/sidebar";
import { LogoLoader } from "@/components/ui";
import { api } from "@/lib/api/client";
import type { AdminSession } from "@/lib/auth";

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
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
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <LogoLoader label="Signing you in..." />
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar email={session.email} />
      <main className="min-h-screen px-4 pb-12 pt-18 sm:px-6 lg:ml-64 lg:px-8 lg:pt-8">
        {/* Each page fades in as you move between them. */}
        <div key={pathname} className="animate-rise-in mx-auto max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  );
};
