"use client";

import { useRef, useState } from "react";

/**
 * Envio de imagem pelo servidor (POST /api/blob/upload → Vercel Blob).
 * Mostra prévia e devolve a URL pública.
 */
export function ImageUpload({
  value,
  onChange,
  aspect = "square",
  hint,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  aspect?: "square" | "wide";
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/blob/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Falha ao enviar.");
      }
      const { url } = (await res.json()) as { url: string };
      onChange(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao enviar a imagem.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const box = aspect === "wide" ? "aspect-[16/6] w-full" : "h-24 w-24";
  const defaultHint =
    aspect === "wide" ? "Paisagem, ~1200×450px, até 4 MB" : "Quadrada, mín. 400×400px, até 4 MB";

  return (
    <div className="flex flex-col gap-2">
      <div className={`${box} overflow-hidden rounded-2xl border border-line bg-card`}>
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="prévia" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted">sem imagem</div>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="rounded-xl bg-accent/15 px-3 py-2 text-xs font-semibold text-accent disabled:opacity-70"
        >
          {busy ? "Enviando…" : value ? "Trocar imagem" : "Enviar imagem"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={busy}
            className="rounded-xl bg-danger/15 px-3 py-2 text-xs font-semibold text-danger disabled:opacity-70"
          >
            Remover
          </button>
        )}
      </div>
      <p className="text-[11px] text-muted">{hint ?? defaultHint}</p>
      {err && <p className="text-xs font-semibold text-danger">{err}</p>}
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </div>
  );
}
