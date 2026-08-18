"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { selecionarCampeonato } from "@/app/campeonatos/actions";

type Item = {
  id: string;
  nome: string;
  temporada: string;
  selecionado: boolean;
};

export function ChampionshipPicker({ campeonatos }: { campeonatos: Item[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [alvo, setAlvo] = useState<string | null>(null);

  function escolher(id: string) {
    setError(null);
    setAlvo(id);
    startTransition(async () => {
      const res = await selecionarCampeonato(id);
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError(res.error);
        setAlvo(null);
      }
    });
  }

  if (campeonatos.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-card p-6 text-center">
        <p className="text-sm text-muted">Nenhum campeonato em andamento.</p>
        <Link
          href="/cadastros/campeonatos"
          className="mt-3 inline-block rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-ink"
        >
          Criar campeonato
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm font-semibold text-danger">{error}</p>}
      <ul className="flex flex-col gap-2">
        {campeonatos.map((c) => (
          <li key={c.id}>
            <button
              onClick={() => escolher(c.id)}
              disabled={pending}
              className={`flex w-full items-center gap-3 rounded-2xl border bg-card px-4 py-4 text-left disabled:opacity-70 ${
                c.selecionado ? "border-accent" : "border-line"
              }`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-lg">
                🏆
              </span>
              <span className="flex-1">
                <span className="block text-sm font-bold text-ink">{c.nome}</span>
                <span className="block text-xs text-muted">{c.temporada}</span>
              </span>
              {c.selecionado && (
                <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[10.5px] font-bold text-accent">
                  Atual
                </span>
              )}
              <span className="text-muted">{pending && alvo === c.id ? "…" : "›"}</span>
            </button>
          </li>
        ))}
      </ul>
      <Link
        href="/cadastros/campeonatos"
        className="mt-1 rounded-xl border border-line bg-card py-2.5 text-center text-sm font-semibold text-muted"
      >
        Gerenciar campeonatos
      </Link>
    </div>
  );
}
