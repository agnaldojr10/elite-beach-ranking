"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createAdmin, revokeAdmin } from "@/app/configuracoes/actions";

type Admin = { id: string; nome: string; email: string; isOwner: boolean };
type Draft = { nome: string; email: string; senha: string };

const initials = (nome: string) => {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
};

export function AdminsManager({ admins }: { admins: Admin[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    if (!draft) return;
    setError(null);
    startTransition(async () => {
      const res = await createAdmin(draft);
      if (res.ok) {
        setDraft(null);
        router.refresh();
      } else setError(res.error);
    });
  }

  function revoke(id: string) {
    if (!confirm("Revogar o acesso deste administrador?")) return;
    startTransition(async () => {
      const res = await revokeAdmin(id);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  const field =
    "mb-3 w-full rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink outline-none focus:border-accent";

  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <ul className="flex flex-col">
        {admins.map((a) => (
          <li key={a.id} className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ocean/15 text-xs font-bold text-ocean">
              {initials(a.nome)}
            </span>
            <span className="flex-1 truncate">
              <span className="block text-sm font-semibold text-ink">{a.nome}</span>
              <span className="block text-[11px] text-muted">{a.email}</span>
            </span>
            {a.isOwner ? (
              <span className="rounded-full bg-line px-2.5 py-1 text-[10.5px] font-bold text-muted">
                Dono
              </span>
            ) : (
              <button
                onClick={() => revoke(a.id)}
                disabled={pending}
                className="rounded-lg bg-danger/15 px-3 py-1.5 text-xs font-semibold text-danger disabled:opacity-70"
              >
                Revogar
              </button>
            )}
          </li>
        ))}
      </ul>

      {error && !draft && <p className="mt-2 text-sm font-semibold text-danger">{error}</p>}

      <button
        onClick={() => {
          setError(null);
          setDraft({ nome: "", email: "", senha: "" });
        }}
        className="mt-3 w-full rounded-xl border border-line bg-surface py-3 text-sm font-bold text-ink"
      >
        + Novo administrador
      </button>

      {draft && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/55" onClick={() => setDraft(null)}>
          <div
            className="mx-auto w-full max-w-md rounded-t-3xl bg-surface p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-ink">Novo administrador</h2>
              <button onClick={() => setDraft(null)} className="text-muted">
                ✕
              </button>
            </div>
            <label className="mb-1 block text-xs font-semibold text-muted">Nome</label>
            <input
              value={draft.nome}
              onChange={(e) => setDraft({ ...draft, nome: e.target.value })}
              className={field}
            />
            <label className="mb-1 block text-xs font-semibold text-muted">E-mail</label>
            <input
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              className={field}
            />
            <label className="mb-1 block text-xs font-semibold text-muted">Senha inicial</label>
            <input
              type="password"
              value={draft.senha}
              onChange={(e) => setDraft({ ...draft, senha: e.target.value })}
              className={field}
            />
            {error && <p className="mb-2 text-sm font-semibold text-danger">{error}</p>}
            <button
              onClick={save}
              disabled={pending}
              className="w-full rounded-xl bg-accent py-3 text-sm font-bold text-accent-ink disabled:opacity-70"
            >
              {pending ? "Criando…" : "Criar admin"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
