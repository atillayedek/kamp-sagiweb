"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/site/Logo";
import { Icon, type IconName } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

const tabs: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/kesfet", label: "Keşfet", icon: "compass" },
  { href: "/topluluklar", label: "Topluluklar", icon: "users" },
  { href: "/mesajlar", label: "Mesajlar", icon: "chat" },
  { href: "/profil", label: "Profil", icon: "user" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-dvh bg-bg pb-24 md:pb-0">
      <a
        href="#icerik"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-2 focus:font-semibold focus:text-primary"
      >
        İçeriğe geç
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-bg">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
          <Link href="/kesfet" className="rounded-control text-primary" aria-label="KampüsAğı — Keşfet">
            <Wordmark />
          </Link>
          <nav aria-label="Uygulama menüsü" className="hidden md:block">
            <ul className="flex gap-1">
              {tabs.map((tab) => (
                <li key={tab.href}>
                  <Link
                    href={tab.href}
                    aria-current={isActive(pathname, tab.href) ? "page" : undefined}
                    className={cn(
                      "inline-flex min-h-11 items-center gap-2 rounded-control px-3 font-semibold transition-colors",
                      isActive(pathname, tab.href) ? "bg-primary-soft text-primary" : "text-ink-muted hover:text-ink",
                    )}
                  >
                    <Icon name={tab.icon} />
                    {tab.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      {children}
      <nav
        aria-label="Uygulama menüsü"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="grid grid-cols-4">
          {tabs.map((tab) => {
            const active = isActive(pathname, tab.href);
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold",
                    active ? "text-primary" : "text-ink-muted",
                  )}
                >
                  <span className={cn("rounded-pill px-4 py-1", active && "bg-primary-soft")}>
                    <Icon name={tab.icon} />
                  </span>
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
