"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

type NavItem = { href: string; label: string; icon: ReactNode };

const NAV: NavItem[] = [
  {
    href: "/ranking",
    label: "Ranking",
    icon: (
      <path d="M8 4h8v4a4 4 0 0 1-8 0V4zM9 16h6M12 12v4M8 20h8" />
    ),
  },
  {
    href: "/sorteio",
    label: "Sorteio",
    icon: <path d="M4 7h3l7 10h4M4 17h3l2.4-3.4M14 7h4M17 4l3 3-3 3M17 14l3 3-3 3" />,
  },
  {
    href: "/torneios",
    label: "Torneios",
    icon: <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8M20 4v4h-4M20 12a8 8 0 0 1-13.7 5.6L4 16M4 20v-4h4" />,
  },
  {
    href: "/cadastros/jogadores",
    label: "Cadastros",
    icon: (
      <path d="M9 8a3.2 3.2 0 1 0 0-.01M3.5 20a5.6 5.6 0 0 1 11 0M17.5 9.2a2.4 2.4 0 1 0 0-.01M15.3 20a4.6 4.6 0 0 1 6.2-4.3" />
    ),
  },
  {
    href: "/configuracoes",
    label: "Config",
    icon: (
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 3v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    ),
  },
];

export function AppShell({ title, children }: { title?: string; children: ReactNode }) {
  const pathname = usePathname();

  const isHome = pathname === "/";

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="flex items-center gap-3 px-5 pb-3 pt-5">
        {!isHome && (
          <Link
            href="/"
            aria-label="Tela inicial"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-card text-ink"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10.5 12 4l9 6.5M5 9.5V20h5v-6h4v6h5V9.5" />
            </svg>
          </Link>
        )}
        {title ? <h1 className="flex-1 text-xl font-bold text-ink">{title}</h1> : <span className="flex-1" />}
        <ThemeToggle />
      </header>

      <main className="flex-1 overflow-y-auto px-5 pb-24">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10.5px] font-semibold ${
                active ? "text-accent" : "text-muted"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                width="21"
                height="21"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {item.icon}
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
