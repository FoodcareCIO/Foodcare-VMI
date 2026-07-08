"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon } from "@/components/ui";
import { ChangePasswordButton } from "./change-password-button";
import { FoodcareLogo } from "./foodcare-logo";
import { SignOutButton } from "./sign-out-button";

const navItems = [
  { href: "/", label: "Overview", icon: "mdi:view-dashboard-outline" },
  { href: "/customers", label: "Customers & Sites", icon: "mdi:office-building-outline" },
  { href: "/products", label: "Products & Minimums", icon: "mdi:package-variant" },
  { href: "/reps", label: "Reps & Assignments", icon: "mdi:account-group-outline" },
  { href: "/orders", label: "Orders", icon: "mdi:clipboard-list-outline" },
  { href: "/admins", label: "Dashboard access", icon: "mdi:shield-account-outline" },
  { href: "/devices", label: "Devices", icon: "mdi:cellphone" },
];

export const Sidebar = ({ email }: { email: string }) => {
  const pathname = usePathname();

  const isActive = (href: string): boolean => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex h-screen w-64 flex-col gap-6 border-r border-slate-800 bg-slate-950 p-4">
      <div className="flex items-center gap-3 px-2 pt-2">
        <FoodcareLogo size={44} />
        <div className="leading-tight">
          <p className="text-2xl font-semibold tracking-tight text-white">Foodcare</p>
          <p className="text-base font-normal text-slate-400">Admin dashboard</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-base transition ${
                active
                  ? "bg-emerald-500 font-medium text-slate-950"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon icon={item.icon} width={20} height={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 pt-4">
        <p className="truncate px-3 pb-2 text-base text-slate-500" title={email}>
          {email}
        </p>
        <ChangePasswordButton />
        <SignOutButton />
      </div>
    </aside>
  );
};
