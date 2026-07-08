"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Input } from "@/components/ui";
import { notify } from "@/lib/notifications";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { validateLogin } from "@/lib/validation";

export const LoginForm = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [busy, setBusy] = useState(false);

  const clearFieldError = (field: "email" | "password") => {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationErrors = validateLogin(email, password);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    setFieldErrors({});
    setBusy(true);

    const supabase = createSupabaseBrowserClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !data.user) {
      notify.error(signInError?.message ?? "Sign in failed.");
      setBusy(false);
      return;
    }

    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", data.user.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (!adminRow) {
      await supabase.auth.signOut();
      notify.error("This account does not have access to the admin dashboard.");
      setBusy(false);
      return;
    }

    router.replace("/");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Input
        label="Email"
        name="email"
        type="email"
        variant="dark"
        prefixIcon="mdi:email-outline"
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          clearFieldError("email");
        }}
        placeholder="admin@foodcare.com"
        error={fieldErrors.email}
      />
      <Input
        label="Password"
        name="password"
        type="password"
        variant="dark"
        prefixIcon="mdi:lock-outline"
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          clearFieldError("password");
        }}
        placeholder="Enter your password"
        error={fieldErrors.password}
      />
      <Button type="submit" variant="primary" fullWidth loading={busy} icon="mdi:login">
        Sign in
      </Button>
    </form>
  );
};
