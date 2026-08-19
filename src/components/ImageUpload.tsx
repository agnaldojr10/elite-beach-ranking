"use client";

import { upload } from "@vercel/blob/client";
import { useRef, useState } from "react";

/**
 * Envio de imagem para o Vercel Blob (upload direto do cliente, com token
 * gerado em /api/blob/upload só para admins). Mostra prévia e devolve a URL.
 */
export function ImageUpload({
  value,
  onChange,
  aspect = "square",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  aspect?: "square" | "wide";
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
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
      });
      onChange(blob.url);
    } catch {
      setErr("Falha ao enviar a imagem. Verifique se o Blob está configurado.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const box =
    aspect === "wide"
      ? "aspect-[16/6] w-full"
      : "h-24 w-24";

  return (
    <div className="flex flex-col gap-2">
      <div className={`${box} overflow-hidden rounded-2xl border border-line bg-card`}>
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="prévia" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted">
            sem imagem
          </div>
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
      {err && <p className="text-xs font-semibold text-danger">{err}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  );
}
