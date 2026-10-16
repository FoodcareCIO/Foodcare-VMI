"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/ui";
import { ChangePasswordButton } from "./change-password-button";
import { FoodcareLogo } from "./foodcare-logo";
import { SignOutButton } from "./sign-out-button";
import { ThemeToggle } from "./theme-toggle";

const navItems = [
  { href: "/", label: "Overview", icon: "mdi:view-dashboard-outline", activeIcon: "mdi:view-dashboard" },
  { href: "/sites", label: "Sites", icon: "mdi:map-marker-outline", activeIcon: "mdi:map-marker" },
  { href: "/products", label: "Products", icon: "mdi:package-variant", activeIcon: "mdi:package-variant-closed" },
  { href: "/reps", label: "Sales reps", icon: "mdi:account-group-outline", activeIcon: "mdi:account-group" },
  { href: "/orders", label: "Orders", icon: "mdi:clipboard-list-outline", activeIcon: "mdi:clipboard-list" },
  { href: "/admins", label: "Team access", icon: "mdi:shield-account-outline", activeIcon: "mdi:shield-account" },
  { href: "/settings", label: "Settings", icon: "mdi:cog-outline", activeIcon: "mdi:cog" },
];

export const Sidebar = ({ email }: { email: string }) => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string): boolean => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      {/* On phones and small tablets the menu is hidden behind a button in a top bar. */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-surface px-4 lg:hidden">
        <div className="flex items-center gap-3">
          <FoodcareLogo size={32} />
          <span className="text-lg font-semibold text-fg">Foodcare</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-fg transition hover:bg-subtle"
        >
          <Icon icon="mdi:menu" size="lg" />
        </button>
      </header>

      {open ? (
        <div
          className="animate-fade-in fixed inset-0 z-40 bg-overlay lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] flex-col gap-6 border-r border-line bg-surface p-4 lg:z-40 lg:flex lg:w-64 ${
          open ? "animate-slide-in-left flex lg:animate-none" : "hidden"
        }`}
      >
        <div className="flex items-center justify-between gap-3 px-2 pt-1">
          <div className="flex items-center gap-3">
            <FoodcareLogo size={40} />
            <div className="leading-tight">
              <p className="text-lg font-semibold text-fg">Foodcare</p>
              <p className="text-xs text-fg-muted">Admin</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-full text-fg-muted transition hover:bg-subtle hover:text-fg lg:hidden"
          >
            <Icon icon="mdi:close" />
          </button>
        </div>

        <nav aria-label="Main" className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                // The focus ring is drawn inside the item: the menu scrolls, which would clip an outer ring.
                className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-subhead transition -outline-offset-2 ${
                  active
                    ? "bg-primary-soft font-medium text-primary-text"
                    : "text-fg hover:bg-subtle"
                }`}
              >
                {/* A fixed-size slot, so the label never moves when the icon changes. */}
                <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                  <Icon icon={active ? item.activeIcon : item.icon} size="lg" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col gap-3 border-t border-line pt-4">
          <div className="px-2">
            <p className="text-xs text-fg-muted">Signed in as</p>
            <p className="truncate text-sm font-medium text-fg" title={email}>
              {email}
            </p>
          </div>
          <ThemeToggle />
          <div className="flex flex-col">
            <ChangePasswordButton />
            <SignOutButton />
          </div>
        </div>
      </aside>
    </>
  );
};
