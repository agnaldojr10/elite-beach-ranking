"use client";

import { useActionState, useState } from "react";
import { criarAcesso } from "@/app/convite/[token]/actions";

type Player = { nome: string; clube: string | null; photoUrl: string | null };

const initials = (nome: string) => {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
};
const primeiro = (nome: string) => nome.trim().split(/\s+/)[0];

const input =
  "w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink outline-none focus:border-accent";
const labelCls = "mb-1 block text-[11.5px] font-semibold text-muted";

export function ConviteClient({ token, player }: { token: string; player: Player }) {
  const [step, setStep] = useState<"confirm" | "senha">("confirm");
  const [error, formAction, pending] = useActionState(criarAcesso, undefined);

  if (step === "confirm") {
    return (
      <div className="flex min-h-dvh flex-col px-6 pb-10 pt-14">
        <div className="mb-6 flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" className="h-9 w-9" />
          <div className="text-[12.5px] font-extrabold leading-none text-ink">
            ELITE BEACH
            <br />
            <span className="text-accent">RANKING</span>
          </div>
        </div>

        <h1 className="text-[30px] font-extrabold leading-tight tracking-[-.02em] text-ink">
          Bem-vindo,
          <br />
          {primeiro(player.nome)}
        </h1>
        <p className="mt-2 max-w-[280px] text-[13.5px] text-muted">
          Confirme que é você para criar seu acesso ao ranking.
        </p>

        <div className="mt-6 flex items-center gap-3.5 rounded-3xl border border-line bg-card p-[18px]">
          {player.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.photoUrl} alt={player.nome} className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ocean/15 text-lg font-bold text-ocean">
              {initials(player.nome)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-bold text-ink">{player.nome}</p>
            {player.clube && <p className="text-[12px] text-muted">{player.clube}</p>}
          </div>
          <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[10.5px] font-extrabold text-accent">ATLETA</span>
        </div>

        <div className="mt-4 flex gap-2.5 rounded-2xl border border-ocean/20 bg-ocean/10 p-3.5">
          <span className="mt-0.5 shrink-0 text-ocean">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8h.01M11 12h1v4h1" />
            </svg>
          </span>
          <p className="text-[11.5px] leading-relaxed text-ink">
            Você acompanha ranking, jogos e desempenho.{" "}
            <span className="font-semibold">Quem lança os placares é a organização.</span>
          </p>
        </div>

        <div className="flex-1" />
        <button
          onClick={() => setStep("senha")}
          className="mt-6 w-full rounded-full bg-accent px-4 py-4 text-[15px] font-extrabold text-accent-ink"
        >
          Sou eu, continuar
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col px-6 pb-10 pt-10">
      <button
        onClick={() => setStep("confirm")}
        className="mb-4 flex h-[38px] w-[38px] items-center justify-center rounded-[14px] border border-line bg-card text-ink"
        aria-label="Voltar"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </button>

      <h1 className="text-[26px] font-extrabold tracking-[-.01em] text-ink">Crie seu acesso</h1>
      <p className="mt-1 text-[13px] text-muted">Para {primeiro(player.nome)} — você usará isso para entrar depois.</p>

      <form action={formAction} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="token" value={token} />
        <label>
          <span className={labelCls}>Nova senha</span>
          <input name="senha" type="password" required minLength={8} autoComplete="new-password" className={input} placeholder="Mínimo de 8 caracteres" />
        </label>
        <label>
          <span className={labelCls}>Confirmar senha</span>
          <input name="confirmar" type="password" required minLength={8} autoComplete="new-password" className={input} />
        </label>
        <label>
          <span className={labelCls}>E-mail ou telefone (para entrar depois)</span>
          <input name="contato" type="text" required className={input} placeholder="seu@email.com ou (17) 99999-9999" />
          <span className="mt-1 block text-[11px] text-muted">Usamos só para login e recuperação de acesso.</span>
        </label>

        {error && (
          <p className="rounded-xl bg-danger/15 px-3.5 py-2.5 text-sm font-semibold text-danger">{error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-1 w-full rounded-full bg-accent px-4 py-4 text-[15px] font-extrabold text-accent-ink disabled:opacity-70"
        >
          {pending ? "Criando…" : "Criar acesso"}
        </button>
      </form>
    </div>
  );
}
