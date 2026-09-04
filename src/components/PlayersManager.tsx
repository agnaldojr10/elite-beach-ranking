"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  archivePlayer,
  createPlayer,
  gerarLinkConvite,
  updatePlayer,
} from "@/app/cadastros/jogadores/actions";
import { ImageUpload } from "@/components/ImageUpload";

type Player = {
  id: string;
  nome: string;
  email: string | null;
  photoUrl: string | null;
  type: "REGULAR" | "GUEST";
  vinculado: boolean;
};
type Filter = "todos" | "REGULAR" | "GUEST";
type Draft = {
  id?: string;
  nome: string;
  email: string;
  photoUrl: string | null;
  type: "REGULAR" | "GUEST";
  vinculado?: boolean;
};

function initials(nome: string) {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
}

export function PlayersManager({ players }: { players: Player[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function gerarLink(playerId: string) {
    setError(null);
    setLink(null);
    setLinkCopied(false);
    startTransition(async () => {
      const res = await gerarLinkConvite(playerId);
      if (res.ok) {
        const url = `${window.location.origin}/convite/${res.token}`;
        setLink(url);
        try {
          await navigator.clipboard.writeText(url);
          setLinkCopied(true);
        } catch {
          /* sem clipboard — mostra o link para copiar manual */
        }
      } else setError(res.error);
    });
  }

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return players.filter(
      (p) => (filter === "todos" || p.type === filter) && p.nome.toLowerCase().includes(q),
    );
  }, [players, search, filter]);

  function save() {
    if (!draft) return;
    setError(null);
    const input = {
      nome: draft.nome,
      email: draft.email,
      photoUrl: draft.photoUrl,
      type: draft.type,
    };
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
          setDraft({ nome: "", email: "", photoUrl: null, type: "REGULAR" });
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
                  setLink(null);
                  setLinkCopied(false);
                  setDraft({
                    id: p.id,
                    nome: p.nome,
                    email: p.email ?? "",
                    photoUrl: p.photoUrl,
                    type: p.type,
                    vinculado: p.vinculado,
                  });
                }}
                className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-left"
              >
                {p.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photoUrl} alt={p.nome} className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ocean/15 text-xs font-bold text-ocean">
                    {initials(p.nome)}
                  </span>
                )}
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

            <label className="mb-1 block text-xs font-semibold text-muted">Foto</label>
            <div className="mb-3">
              <ImageUpload
                value={draft.photoUrl}
                onChange={(url) => setDraft({ ...draft, photoUrl: url })}
                aspect="square"
              />
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
            {draft.id && draft.type === "REGULAR" && (
              <div className="mt-4 rounded-xl border border-line bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-ink">Acesso do atleta</p>
                  {draft.vinculado && (
                    <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-[10px] font-bold text-success">
                      Jogador vinculado
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-muted">
                  {draft.vinculado
                    ? "Se ele esqueceu a senha, gere um link de redefinição e reenvie."
                    : "Gere o link e envie no WhatsApp. No 1º acesso o jogador cria a senha."}
                </p>
                <button
                  onClick={() => gerarLink(draft.id!)}
                  disabled={pending}
                  className="mt-2 w-full rounded-xl bg-accent/15 py-2.5 text-sm font-semibold text-accent disabled:opacity-70"
                >
                  {pending
                    ? "Gerando…"
                    : draft.vinculado
                      ? "Resetar senha (reenviar link)"
                      : link
                        ? "Gerar novo link"
                        : "Gerar link de acesso"}
                </button>
                {link && (
                  <div className="mt-2 flex flex-col gap-2">
                    <p className="break-all rounded-lg bg-surface px-3 py-2 text-[11px] text-muted">{link}</p>
                    {linkCopied && <p className="text-[11px] font-semibold text-success">Link copiado!</p>}
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        draft.vinculado
                          ? `Redefinição de senha do Ranking Elite Beach: ${link}\n\nAbra o link e crie uma nova senha de acesso. O link vale 7 dias.`
                          : `Seu acesso ao Ranking Elite Beach: ${link}\n\nAbra o link, confirme que é você e crie sua senha. O link vale 7 dias.`,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl bg-success/15 py-2.5 text-center text-sm font-semibold text-success"
                    >
                      Enviar no WhatsApp
                    </a>
                  </div>
                )}
              </div>
            )}

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
