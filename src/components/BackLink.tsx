import Link from "next/link";
import type { ReactNode } from "react";

/** Botão estilizado de "voltar" para as telas de detalhe. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3.5 py-2 text-xs font-semibold text-ink"
    >
      <span className="text-accent">‹</span>
      {children}
    </Link>
  );
}
