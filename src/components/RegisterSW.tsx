"use client";

import { useEffect } from "react";

let refreshing = false;

export function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* ignora falha de registro */
    });

    // Quando um novo service worker assume o controle, recarrega uma vez
    // (garante que o app rode a versão nova sem F5 manual).
    const onChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onChange);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onChange);
  }, []);

  return null;
}
