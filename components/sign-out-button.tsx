"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui";
import { api } from "@/lib/api/client";

export const SignOutButton = () => {
  const router = useRouter();

  const handleSignOut = async () => {
    await api.post("/api/auth/session", {});
    router.replace("/login");
    router.refresh();
  };

  return (
    <Button
      variant="ghost"
      fullWidth
      icon="mdi:logout"
      className="justify-start px-3! py-2! font-normal! text-base! text-slate-300 hover:bg-slate-800! hover:text-white!"
      onClick={() => void handleSignOut()}
    >
      Sign out
    </Button>
  );
};
