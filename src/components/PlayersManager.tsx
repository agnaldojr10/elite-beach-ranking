"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  archivePlayer,
  createPlayer,
  updatePlayer,
} from "@/app/cadastros/jogadores/actions";

type Player = { id: string; nome: string; email: string | null; type: "REGULAR" | "GUEST" };
type Filter = "todos" | "REGULAR" | "GUEST";
type Draft = { id?: string; nome: string; email: string; type: "REGULAR" | "GUEST" };

function initials(nome: string) {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
}

export function PlayersManager({ players }: { players: Player[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return players.filter(
      (p) => (filter === "todos" || p.type === filter) && p.nome.toLowerCase().includes(q),
    );
  }, [players, search, filter]);

  function save() {
    if (!draft) return;
    setError(null);
    const input = { nome: draft.nome, email: draft.email, type: draft.type };
    startTransition(async () => {
      const res = draft.id
        ? await updatePlayer(draft.id, input)
        : await createPlayer(input);
      if (res.ok) {
        setDraft(null);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function archive() {
    if (!draft?.id) return;
    if (!confirm("Arquivar este jogador? O histórico é mantido.")) return;
    startTransition(async () => {
      const res = await archivePlayer(draft.id!);
      if (res.ok) {
        setDraft(null);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  const chip = (v: Filter, label: string) => (
    <button
      onClick={() => setFilter(v)}
      className={`rounded-xl px-4 py-2 text-sm font-semibold ${
        filter === v ? "bg-accent text-accent-ink" : "border border-line bg-card text-muted"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-3">
      {/* sub-abas de Cadastros */}
      <div className="flex gap-2">
        <span className="flex-1 rounded-xl bg-accent py-2.5 text-center text-sm font-bold text-accent-ink">
          Jogadores
        </span>
        <Link
          href="/cadastros/campeonatos"
          className="flex-1 rounded-xl border border-line bg-card py-2.5 text-center text-sm font-semibold text-muted"
        >
          Campeonatos
        </Link>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar jogador..."
        className="rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink outline-none placeholder:text-muted focus:border-accent"
      />

      <div className="flex gap-2">
        {chip("todos", "Todos")}
        {chip("REGULAR", "Jogador")}
        {chip("GUEST", "Convidado")}
      </div>

      <button
        onClick={() => {
          setError(null);
          setDraft({ nome: "", email: "", type: "REGULAR" });
        }}
        className="rounded-xl bg-accent py-3 text-sm font-bold text-accent-ink"
      >
        + Novo jogador
      </button>

      {list.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">Nenhum jogador encontrado.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => {
                  setError(null);
                  setDraft({ id: p.id, nome: p.nome, email: p.email ?? "", type: p.type });
                }}
                className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-left"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ocean/15 text-xs font-bold text-ocean">
                  {initials(p.nome)}
                </span>
                <span className="flex-1 truncate text-sm font-semibold text-ink">{p.nome}</span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold ${
                    p.type === "GUEST"
                      ? "bg-warning/15 text-warning"
                      : "bg-ocean/15 text-ocean"
                  }`}
                >
                  {p.type === "GUEST" ? "Convidado" : "Jogador"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {draft && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/55" onClick={() => setDraft(null)}>
          <div
            className="mx-auto w-full max-w-md rounded-t-3xl bg-surface p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">
                {draft.id ? "Editar jogador" : "Novo jogador"}
              </h2>
              <button onClick={() => setDraft(null)} className="text-muted">
                ✕
              </button>
            </div>

            <label className="mb-1 block text-xs font-semibold text-muted">Nome</label>
            <input
              value={draft.nome}
              onChange={(e) => setDraft({ ...draft, nome: e.target.value })}
              className="mb-3 w-full rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            />

            <label className="mb-1 block text-xs font-semibold text-muted">E-mail (opcional)</label>
            <input
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              className="mb-3 w-full rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            />

            <label className="mb-1 block text-xs font-semibold text-muted">Tipo</label>
            <div className="mb-2 flex gap-2">
              {(["REGULAR", "GUEST"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setDraft({ ...draft, type: t })}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-semibold ${
                    draft.type === t
                      ? "bg-accent text-accent-ink"
                      : "border border-line bg-card text-muted"
                  }`}
                >
                  {t === "REGULAR" ? "Jogador" : "Convidado"}
                </button>
              ))}
            </div>
            {draft.type === "GUEST" && (
              <p className="mb-2 text-xs text-muted">Convidados não pontuam no ranking.</p>
            )}

            {error && <p className="mb-2 text-sm font-semibold text-danger">{error}</p>}

            <button
              onClick={save}
              disabled={pending}
              className="mt-2 w-full rounded-xl bg-accent py-3 text-sm font-bold text-accent-ink disabled:opacity-70"
            >
              {pending ? "Salvando…" : "Salvar"}
            </button>
            {draft.id && (
              <button
                onClick={archive}
                disabled={pending}
                className="mt-2 w-full rounded-xl bg-danger/15 py-3 text-sm font-bold text-danger disabled:opacity-70"
              >
                Arquivar jogador
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
