"use client";

import { useEffect, useState } from "react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const DISMISS_KEY = "ebr_install_dismissed_at";
const REPROMPT_DAYS = 7;

function jaInstalado(): boolean {
  if (typeof window === "undefined") return true;
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return !!standalone || !!iosStandalone;
}

function ehIOS(): boolean {
  const ua = navigator.userAgent;
  const iphone = /iphone|ipad|ipod/i.test(ua);
  const ipadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iphone || ipadOS;
}

function dispensadoRecente(): boolean {
  try {
    const at = localStorage.getItem(DISMISS_KEY);
    if (!at) return false;
    const dias = (Date.now() - Number(at)) / 86_400_000;
    return dias < REPROMPT_DAYS;
  } catch {
    return false;
  }
}

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [modo, setModo] = useState<"android" | "ios">("android");
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);

  useEffect(() => {
    if (jaInstalado() || dispensadoRecente()) return;

    let timer: ReturnType<typeof setTimeout>;

    if (ehIOS()) {
      setModo("ios");
      timer = setTimeout(() => setVisible(true), 1800);
    } else {
      const onBIP = (e: Event) => {
        e.preventDefault();
        setDeferred(e as BIPEvent);
        setModo("android");
        setVisible(true);
      };
      window.addEventListener("beforeinstallprompt", onBIP);
      const onInstalled = () => setVisible(false);
      window.addEventListener("appinstalled", onInstalled);
      return () => {
        window.removeEventListener("beforeinstallprompt", onBIP);
        window.removeEventListener("appinstalled", onInstalled);
      };
    }
    return () => clearTimeout(timer);
  }, []);

  function fechar(marcarDispensa = true) {
    if (marcarDispensa) {
      try {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
      } catch {
        /* sem storage */
      }
    }
    setVisible(false);
  }

  async function instalar() {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      fechar(outcome !== "accepted");
    } catch {
      fechar();
    }
    setDeferred(null);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/50" onClick={() => fechar()}>
      <div
        className="w-full max-w-md rounded-t-[26px] border border-line bg-card p-5 pb-8 shadow-2xl animate-[posterIn_.28s_ease]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted/30" />

        <div className="flex items-center gap-3">
          <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[16px] bg-accent/15 text-[26px]">🎾</div>
          <div className="flex-1">
            <h2 className="text-[16px] font-black text-ink">Instale o app na tela inicial</h2>
            <p className="text-[11.5px] text-muted">Abre rápido, tela cheia e recebe as notificações da rodada.</p>
          </div>
        </div>

        {modo === "android" ? (
          <div className="mt-4 flex flex-col gap-2">
            <button
              onClick={instalar}
              className="w-full rounded-full bg-accent py-3.5 text-center text-[14px] font-extrabold text-accent-ink"
            >
              Instalar agora
            </button>
            <button onClick={() => fechar()} className="w-full py-2 text-center text-[12.5px] font-semibold text-muted">
              Agora não
            </button>
          </div>
        ) : (
          <div className="mt-4">
            <p className="mb-2.5 text-[12px] font-bold text-ink">É rapidinho, no Safari:</p>
            <div className="flex flex-col gap-2">
              <Passo n={1}>
                Toque no botão <b>Compartilhar</b>
                <ShareIcon /> na barra do Safari (embaixo).
              </Passo>
              <Passo n={2}>
                Role e toque em <b>Adicionar à Tela de Início</b> <span className="font-black">＋</span>.
              </Passo>
              <Passo n={3}>
                Confirme em <b>Adicionar</b>. Pronto — o ícone 🎾 aparece na sua tela.
              </Passo>
            </div>
            <button
              onClick={() => fechar()}
              className="mt-4 w-full rounded-full bg-accent/15 py-3 text-center text-[13px] font-extrabold text-accent"
            >
              Entendi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Passo({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-[14px] border border-line bg-surface px-3 py-2.5">
      <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-black text-accent-ink">
        {n}
      </span>
      <p className="text-[12px] leading-snug text-ink">{children}</p>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" className="mx-0.5 inline-block align-text-bottom" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12M8 7l4-4 4 4M6 12v7a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-7" />
    </svg>
  );
}
