"use client";

import { useEffect, useRef } from "react";

const LOADED = process.env.NEXT_PUBLIC_BUILD_ID || "dev";

/**
 * Detecta um novo deploy e recarrega o app sozinho (sem F5 manual e sem
 * deslogar). Compara a versão embutida no bundle com a versão viva do servidor.
 */
export function VersionWatcher() {
  const reloading = useRef(false);

  useEffect(() => {
    if (LOADED === "dev") return; // só em produção (com build id real)
    let stopped = false;

    async function check() {
      if (reloading.current || document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { v?: string };
        if (data.v && data.v !== LOADED) {
          reloading.current = true;
          window.location.reload();
        }
      } catch {
        /* offline/transitório — ignora */
      }
    }

    const id = setInterval(check, 90_000);
    const onVisible = () => check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    check();

    return () => {
      stopped = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      void stopped;
    };
  }, []);

  return null;
}
