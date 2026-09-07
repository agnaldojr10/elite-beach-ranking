"use client";

import { useRouter } from "next/navigation";

type Opt = { id: string; nome: string };

export function CompareSelector({ options, a, b }: { options: Opt[]; a: string; b: string }) {
  const router = useRouter();

  function go(next: { a?: string; b?: string }) {
    const na = next.a ?? a;
    const nb = next.b ?? b;
    const q = new URLSearchParams();
    if (na) q.set("a", na);
    if (nb) q.set("b", nb);
    router.push(`/comparar?${q.toString()}`);
  }

  const sel =
    "w-full appearance-none rounded-[14px] border border-line bg-card px-3 py-2.5 text-[12.5px] font-semibold text-ink outline-none focus:border-accent";

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <select className={sel} value={a} onChange={(e) => go({ a: e.target.value })}>
        <option value="">Atleta 1</option>
        {options.map((o) => (
          <option key={o.id} value={o.id} disabled={o.id === b}>
            {o.nome}
          </option>
        ))}
      </select>
      <span className="text-[13px] font-black text-muted">×</span>
      <select className={sel} value={b} onChange={(e) => go({ b: e.target.value })}>
        <option value="">Atleta 2</option>
        {options.map((o) => (
          <option key={o.id} value={o.id} disabled={o.id === a}>
            {o.nome}
          </option>
        ))}
      </select>
    </div>
  );
}
