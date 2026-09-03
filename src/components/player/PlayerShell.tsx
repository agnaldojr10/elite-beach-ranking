"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  { href: "/inicio", label: "Início", icon: <path d="M3 10.5 12 4l9 6.5M5 9.5V20h5v-6h4v6h5V9.5" /> },
  { href: "/classificacao", label: "Ranking", icon: <path d="M8 4h8v4a4 4 0 0 1-8 0V4zM9 16h6M12 12v4M8 20h8" /> },
  { href: "/desempenho", label: "Desempenho", icon: <path d="M4 19V5M4 19h16M8 16v-4M13 16V9M18 16v-6" /> },
  { href: "/perfil", label: "Perfil", icon: <path d="M12 11.2a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2zM5 20a7 7 0 0 1 14 0" /> },
];

export function PlayerIcon({ size = 21, children }: { size?: number; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function PlayerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-base">
      <main className="flex-1 px-5 pb-28 pt-2">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] pt-3">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1.5 pb-3 text-[10.5px] font-semibold ${
                active ? "text-accent" : "text-muted"
              }`}
            >
              <PlayerIcon>{item.icon}</PlayerIcon>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
