"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PhotoEditor } from "@/components/player/PhotoEditor";
import { atualizarFotoAtleta, alterarSenhaAtleta } from "@/app/perfil/actions";

const input = "w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink outline-none focus:border-accent";
const label = "mb-1 block text-[11.5px] font-semibold text-muted";

export function PerfilClient({ nome, clube, foto }: { nome: string; clube: string | null; foto: string | null }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [openSenha, setOpenSenha] = useState(false);
  const [msg, formAction, pending] = useActionState(alterarSenhaAtleta, undefined);

  function onFoto(url: string | null) {
    startTransition(async () => {
      await atualizarFotoAtleta(url);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center rounded-[26px] border border-line bg-card p-4 text-center">
        <p className="mb-2 self-start text-[9.5px] font-bold tracking-[.1em] text-muted">FOTO DO CARD</p>
        <PhotoEditor value={foto} onChange={onFoto} />
        <p className="mt-3 text-[18px] font-extrabold text-ink">{nome}</p>
        {clube && <p className="text-[12px] text-muted">{clube}</p>}
        <span className="mt-2 rounded-full bg-accent/15 px-2.5 py-1 text-[10.5px] font-extrabold text-accent">ATLETA</span>
      </div>

      <div className="rounded-[20px] border border-line bg-card">
        <button
          onClick={() => setOpenSenha((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3.5 text-left"
        >
          <span className="text-[13.5px] font-semibold text-ink">Alterar senha</span>
          <span className={`text-muted transition-transform ${openSenha ? "rotate-90" : ""}`}>›</span>
        </button>
        {openSenha && (
          <form action={formAction} className="flex flex-col gap-3 border-t border-line px-4 py-4">
            <div>
              <span className={label}>Senha atual</span>
              <input name="atual" type="password" required className={input} />
            </div>
            <div>
              <span className={label}>Nova senha</span>
              <input name="nova" type="password" required minLength={8} className={input} placeholder="Mínimo 8 caracteres" />
            </div>
            <div>
              <span className={label}>Confirmar nova senha</span>
              <input name="confirmar" type="password" required minLength={8} className={input} />
            </div>
            {msg && msg !== "OK" && (
              <p className="rounded-xl bg-danger/15 px-3.5 py-2.5 text-sm font-semibold text-danger">{msg}</p>
            )}
            {msg === "OK" && (
              <p className="rounded-xl bg-success/15 px-3.5 py-2.5 text-sm font-semibold text-success">Senha alterada!</p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-accent py-3 text-[14px] font-extrabold text-accent-ink disabled:opacity-70"
            >
              {pending ? "Salvando…" : "Salvar nova senha"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
