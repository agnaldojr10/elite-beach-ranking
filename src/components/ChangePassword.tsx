"use client";

import { useState, useTransition } from "react";
import { changePassword } from "@/app/configuracoes/actions";

const field =
  "mb-3 w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink outline-none focus:border-accent";

export function ChangePassword() {
  const [open, setOpen] = useState(false);
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [conf, setConf] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    setMsg(null);
    if (nova !== conf) {
      setError("A nova senha e a confirmação não coincidem.");
      return;
    }
    startTransition(async () => {
      const res = await changePassword({ atual, nova });
      if (res.ok) {
        setMsg("Senha alterada com sucesso.");
        setAtual("");
        setNova("");
        setConf("");
        setOpen(false);
      } else setError(res.error);
    });
  }

  if (!open) {
    return (
      <div className="mb-2">
        <button
          onClick={() => {
            setMsg(null);
            setOpen(true);
          }}
          className="w-full rounded-xl border border-line bg-surface py-3 text-sm font-bold text-ink"
        >
          Alterar senha
        </button>
        {msg && <p className="mt-2 text-sm font-semibold text-success">{msg}</p>}
      </div>
    );
  }

  return (
    <div className="mb-2 rounded-2xl border border-line bg-card p-4">
      <input type="password" placeholder="Senha atual" value={atual} onChange={(e) => setAtual(e.target.value)} className={field} />
      <input type="password" placeholder="Nova senha" value={nova} onChange={(e) => setNova(e.target.value)} className={field} />
      <input type="password" placeholder="Confirmar nova senha" value={conf} onChange={(e) => setConf(e.target.value)} className={field} />
      {error && <p className="mb-2 text-sm font-semibold text-danger">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-line bg-surface py-3 text-sm font-semibold text-muted">
          Cancelar
        </button>
        <button onClick={save} disabled={pending} className="flex-1 rounded-xl bg-accent py-3 text-sm font-bold text-accent-ink disabled:opacity-70">
          {pending ? "Salvando…" : "Salvar"}
        </button>
      </div>
      {msg && <p className="mt-2 text-sm font-semibold text-success">{msg}</p>}
    </div>
  );
}
