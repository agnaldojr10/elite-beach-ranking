"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createChampionship,
  generateRounds,
  setActiveChampionship,
  updateChampionship,
} from "@/app/cadastros/campeonatos/actions";

type Champ = {
  id: string;
  nome: string;
  temporada: string;
  formato: string;
  status: "ATIVA" | "ENCERRADA";
  inicio: string;
  fim: string;
  finalsDate: string;
};
type Draft = Omit<Champ, "status" | "id"> & { id?: string };
type GenState = { id: string; qtd: number; inicio: string };

const brDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
};

const field =
  "w-full rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink outline-none focus:border-accent";
const label = "mb-1 block text-xs font-semibold text-muted";

export function ChampionshipsManager({ campeonatos }: { campeonatos: Champ[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [gen, setGen] = useState<GenState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const newDraft = (): Draft => ({
    nome: "",
    temporada: "",
    formato: "Grupos + mata-mata",
    inicio: "",
    fim: "",
    finalsDate: "",
  });

  function save() {
    if (!draft) return;
    setError(null);
    const { id, ...input } = draft;
    startTransition(async () => {
      const res = id ? await updateChampionship(id, input) : await createChampionship(input);
      if (res.ok) {
        setDraft(null);
        router.refresh();
      } else setError(res.error);
    });
  }

  function activate(id: string) {
    startTransition(async () => {
      const res = await setActiveChampionship(id);
      if (res.ok) router.refresh();
    });
  }

  function runGen() {
    if (!gen) return;
    setError(null);
    startTransition(async () => {
      const res = await generateRounds(gen.id, { qtd: gen.qtd, inicio: gen.inicio });
      if (res.ok) {
        setGen(null);
        router.refresh();
      } else setError(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Link
          href="/cadastros/jogadores"
          className="flex-1 rounded-xl border border-line bg-card py-2.5 text-center text-sm font-semibold text-muted"
        >
          Jogadores
        </Link>
        <span className="flex-1 rounded-xl bg-accent py-2.5 text-center text-sm font-bold text-accent-ink">
          Campeonatos
        </span>
      </div>

      <button
        onClick={() => {
          setError(null);
          setDraft(newDraft());
        }}
        className="rounded-xl bg-accent py-3 text-sm font-bold text-accent-ink"
      >
        + Novo campeonato
      </button>

      {campeonatos.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Nenhum campeonato ainda.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {campeonatos.map((c) => (
            <li key={c.id} className="rounded-2xl border border-line bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-ink">{c.nome}</p>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${
                    c.status === "ATIVA" ? "bg-success/15 text-success" : "bg-line text-muted"
                  }`}
                >
                  {c.status === "ATIVA" ? "Ativo" : "Encerrado"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {brDate(c.inicio)}–{brDate(c.fim)} · Finals {brDate(c.finalsDate)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setError(null);
                    setDraft({ ...c });
                  }}
                  className="rounded-lg bg-accent/15 px-3 py-2 text-xs font-semibold text-accent"
                >
                  Editar
                </button>
                {c.status !== "ATIVA" && (
                  <button
                    onClick={() => activate(c.id)}
                    disabled={pending}
                    className="rounded-lg bg-accent/15 px-3 py-2 text-xs font-semibold text-accent disabled:opacity-70"
                  >
                    Definir como ativo
                  </button>
                )}
                <button
                  onClick={() => {
                    setError(null);
                    setGen({ id: c.id, qtd: 10, inicio: c.inicio });
                  }}
                  className="rounded-lg bg-accent/15 px-3 py-2 text-xs font-semibold text-accent"
                >
                  Gerar rodadas
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* modal criar/editar */}
      {draft && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/55" onClick={() => setDraft(null)}>
          <div
            className="mx-auto max-h-[88%] w-full max-w-md overflow-y-auto rounded-t-3xl bg-surface p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">
                {draft.id ? "Editar campeonato" : "Novo campeonato"}
              </h2>
              <button onClick={() => setDraft(null)} className="text-muted">
                ✕
              </button>
            </div>

            <label className={label}>Nome</label>
            <input
              value={draft.nome}
              onChange={(e) => setDraft({ ...draft, nome: e.target.value })}
              className={`${field} mb-3`}
            />
            <label className={label}>Temporada</label>
            <input
              value={draft.temporada}
              onChange={(e) => setDraft({ ...draft, temporada: e.target.value })}
              className={`${field} mb-3`}
            />
            <label className={label}>Formato</label>
            <input
              value={draft.formato}
              onChange={(e) => setDraft({ ...draft, formato: e.target.value })}
              className={`${field} mb-3`}
            />
            <div className="mb-3 flex gap-3">
              <div className="flex-1">
                <label className={label}>Início</label>
                <input
                  type="date"
                  value={draft.inicio}
                  onChange={(e) => setDraft({ ...draft, inicio: e.target.value })}
                  className={field}
                />
              </div>
              <div className="flex-1">
                <label className={label}>Fim</label>
                <input
                  type="date"
                  value={draft.fim}
                  onChange={(e) => setDraft({ ...draft, fim: e.target.value })}
                  className={field}
                />
              </div>
            </div>
            <label className={label}>Data da FINALS</label>
            <input
              type="date"
              value={draft.finalsDate}
              onChange={(e) => setDraft({ ...draft, finalsDate: e.target.value })}
              className={`${field} mb-3`}
            />

            {error && <p className="mb-2 text-sm font-semibold text-danger">{error}</p>}
            <button
              onClick={save}
              disabled={pending}
              className="mt-1 w-full rounded-xl bg-accent py-3 text-sm font-bold text-accent-ink disabled:opacity-70"
            >
              {pending ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {/* modal gerar rodadas */}
      {gen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/55" onClick={() => setGen(null)}>
          <div
            className="mx-auto w-full max-w-md rounded-t-3xl bg-surface p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">Gerar rodadas</h2>
              <button onClick={() => setGen(null)} className="text-muted">
                ✕
              </button>
            </div>
            <label className={label}>Nº de rodadas</label>
            <input
              type="number"
              min={1}
              max={30}
              value={gen.qtd}
              onChange={(e) => setGen({ ...gen, qtd: parseInt(e.target.value) || 1 })}
              className={`${field} mb-3`}
            />
            <label className={label}>Data da 1ª rodada</label>
            <input
              type="date"
              value={gen.inicio}
              onChange={(e) => setGen({ ...gen, inicio: e.target.value })}
              className={`${field} mb-2`}
            />
            <p className="mb-2 text-xs text-muted">
              Cria uma rodada por semana; a última já vem com peso 2x e a FINALS é criada como
              etapa especial.
            </p>
            {error && <p className="mb-2 text-sm font-semibold text-danger">{error}</p>}
            <button
              onClick={runGen}
              disabled={pending}
              className="mt-1 w-full rounded-xl bg-accent py-3 text-sm font-bold text-accent-ink disabled:opacity-70"
            >
              {pending ? "Gerando…" : "Gerar rodadas"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
