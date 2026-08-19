"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { selecionarCampeonato } from "@/app/campeonatos/actions";

type Item = {
  id: string;
  nome: string;
  temporada: string;
  status: "ATIVA" | "ENCERRADA";
  bannerUrl: string | null;
  logoUrl: string | null;
  selecionado: boolean;
};
type Filtro = "ATIVA" | "ENCERRADA";

export function ChampionshipPicker({ campeonatos }: { campeonatos: Item[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [alvo, setAlvo] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("ATIVA");

  const lista = useMemo(
    () => campeonatos.filter((c) => c.status === filtro),
    [campeonatos, filtro],
  );

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

  const tab = (v: Filtro, label: string) => (
    <button
      onClick={() => setFiltro(v)}
      className={`flex-1 rounded-xl py-2.5 text-sm font-semibold ${
        filtro === v ? "bg-accent text-accent-ink" : "border border-line bg-card text-muted"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {tab("ATIVA", "Em andamento")}
        {tab("ENCERRADA", "Encerrados")}
      </div>

      {error && <p className="text-sm font-semibold text-danger">{error}</p>}

      {lista.length === 0 ? (
        <div className="rounded-2xl border border-line bg-card p-6 text-center">
          <p className="text-sm text-muted">
            {filtro === "ATIVA" ? "Nenhum campeonato em andamento." : "Nenhum campeonato encerrado."}
          </p>
          {filtro === "ATIVA" && (
            <Link
              href="/cadastros/campeonatos"
              className="mt-3 inline-block rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-ink"
            >
              Criar campeonato
            </Link>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {lista.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => escolher(c.id)}
                disabled={pending}
                className={`w-full overflow-hidden rounded-2xl border bg-card text-left disabled:opacity-70 ${
                  c.selecionado ? "border-accent" : "border-line"
                }`}
              >
                {c.bannerUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.bannerUrl} alt={c.nome} className="aspect-[16/6] w-full object-cover" />
                )}
                <div className="flex items-center gap-3 px-4 py-4">
                  {c.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.logoUrl} alt={c.nome} className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-lg">
                      🏆
                    </span>
                  )}
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
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/cadastros/campeonatos"
        className="mt-1 rounded-xl border border-line bg-card py-2.5 text-center text-sm font-semibold text-muted"
      >
        Gerenciar campeonatos
      </Link>
    </div>
  );
}
