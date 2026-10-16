"use client";

import { FoodcareLogo } from "@/components/foodcare-logo";
import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="animate-rise-in w-full max-w-sm rounded-2xl border border-line bg-surface p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <FoodcareLogo size={56} className="mb-4" />
          <h1 className="text-3xl text-fg">Foodcare Admin</h1>
          <p className="mt-2 text-base text-fg-muted">
            Sign in to manage sites, products, sales reps and orders.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
