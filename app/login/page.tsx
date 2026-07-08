"use client";

import { FoodcareLogo } from "@/components/foodcare-logo";
import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <FoodcareLogo size={56} className="mb-4" />
          <p className="text-sm font-medium tracking-wider text-emerald-400">
            Back office
          </p>
          <h1 className="text-2xl tracking-tight text-white">Foodcare Admin</h1>
        </div>
        <p className="mb-6 text-center text-sm font-normal leading-relaxed tracking-normal text-slate-400">
          Sign in to manage customers, products, sales reps, and orders from the field.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
