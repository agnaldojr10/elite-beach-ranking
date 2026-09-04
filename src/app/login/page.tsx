"use client";

import { useActionState } from "react";
import { authenticate } from "./actions";

export default function LoginPage() {
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined,
  );

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#081A1E] px-6 text-[#F3EEE2]">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Ranking Elite Beach" className="mb-3 h-20 w-20" />
          <h1 className="text-2xl font-bold">Ranking Elite Beach</h1>
          <p className="mt-1 text-sm font-semibold text-[#FF7A1A]">Bora pro Play!</p>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[#8FA9AE]">E-mail</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="seu@email.com"
              className="rounded-xl border border-white/10 bg-[#0F2A30] px-3.5 py-3 text-sm outline-none focus:border-[#FF7A1A]"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[#8FA9AE]">Senha</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="rounded-xl border border-white/10 bg-[#0F2A30] px-3.5 py-3 text-sm outline-none focus:border-[#FF7A1A]"
            />
          </label>

          {errorMessage && (
            <p className="rounded-xl bg-[#F0645F]/15 px-3.5 py-2.5 text-sm font-semibold text-[#F0645F]">
              {errorMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="mt-1 rounded-xl bg-[#FF7A1A] px-4 py-3 text-sm font-bold text-[#1A0F06] transition disabled:opacity-70"
          >
            {isPending ? "Entrando…" : "Entrar"}
          </button>
        </form>

      </div>
    </main>
  );
}
