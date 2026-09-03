"use client";

import { useEffect, useState } from "react";
import { inscreverPush, cancelarPush } from "@/app/perfil/actions";

const PUB = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function NotifToggle() {
  const [supported, setSupported] = useState(true);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ok = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && !!PUB;
    setSupported(ok);
    if (!ok) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setOn(!!sub))
      .catch(() => {});
  }, []);

  async function ligar() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUB),
      });
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await inscreverPush({ endpoint: json.endpoint, keys: json.keys });
      setOn(true);
    } catch {
      /* falhou */
    } finally {
      setBusy(false);
    }
  }

  async function desligar() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await cancelarPush(sub.endpoint);
        await sub.unsubscribe();
      }
      setOn(false);
    } catch {
      /* ignora */
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return <span className="rounded-full bg-white/7 px-2.5 py-1 text-[10px] font-bold text-muted">indisponível</span>;
  }

  return (
    <button
      onClick={() => (on ? desligar() : ligar())}
      disabled={busy}
      aria-label="Ativar notificações"
      className={`relative h-[26px] w-[46px] shrink-0 rounded-full transition disabled:opacity-60 ${on ? "bg-accent" : "bg-line"}`}
    >
      <span className={`absolute top-0.5 h-[22px] w-[22px] rounded-full bg-white transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}
