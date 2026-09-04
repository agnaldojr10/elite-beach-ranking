"use client";

import { useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

// Proporção da foto no card (PlayerCardCanvas: 900 x 470).
const ASPECT = 900 / 470;
const OUT_W = 1080;
const OUT_H = Math.round(OUT_W / ASPECT);

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function cropToBlob(src: string, area: Area): Promise<Blob | null> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, OUT_W, OUT_H);
  return new Promise((res) => canvas.toBlob((b) => res(b), "image/jpeg", 0.9));
}

export function PhotoEditor({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null); // imagem no editor
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setSrc(URL.createObjectURL(file));
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    if (inputRef.current) inputRef.current.value = "";
  }

  function ajustar() {
    if (!value) return;
    setErr(null);
    setSrc(value);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  }

  async function salvar() {
    if (!src || !area) return;
    setBusy(true);
    setErr(null);
    try {
      const blob = await cropToBlob(src, area);
      if (!blob) throw new Error("Falha ao recortar.");
      const fd = new FormData();
      fd.append("file", new File([blob], "foto.jpg", { type: "image/jpeg" }));
      const res = await fetch("/api/blob/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Falha ao enviar.");
      }
      const { url } = (await res.json()) as { url: string };
      onChange(url);
      if (src.startsWith("blob:")) URL.revokeObjectURL(src);
      setSrc(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao salvar a foto.");
    } finally {
      setBusy(false);
    }
  }

  function cancelar() {
    if (src?.startsWith("blob:")) URL.revokeObjectURL(src);
    setSrc(null);
  }

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <div className="w-full overflow-hidden rounded-2xl border border-line bg-card" style={{ aspectRatio: ASPECT }}>
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="foto" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted">sem foto</div>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-xl bg-accent/15 px-3 py-2 text-xs font-semibold text-accent"
        >
          {value ? "Trocar foto" : "Enviar foto"}
        </button>
        {value && (
          <button type="button" onClick={ajustar} className="rounded-xl bg-ocean/15 px-3 py-2 text-xs font-semibold text-ocean">
            Ajustar
          </button>
        )}
        {value && (
          <button type="button" onClick={() => onChange(null)} className="rounded-xl bg-danger/15 px-3 py-2 text-xs font-semibold text-danger">
            Remover
          </button>
        )}
      </div>
      <p className="text-[11px] text-muted">Enquadre no card. JPG/PNG até 4 MB.</p>
      {err && <p className="text-xs font-semibold text-danger">{err}</p>}
      <input ref={inputRef} type="file" accept="image/*" onChange={pickFile} className="hidden" />

      {src && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-black/80">
          <div className="relative flex-1">
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={ASPECT}
              minZoom={1}
              maxZoom={4}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, px) => setArea(px)}
              restrictPosition
            />
          </div>
          <div className="flex flex-col gap-3 bg-surface px-5 pb-8 pt-4">
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-muted">−</span>
              <input
                type="range"
                min={1}
                max={4}
                step={0.02}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-[color:var(--color-accent)]"
              />
              <span className="text-[11px] text-muted">+</span>
            </div>
            {err && <p className="text-center text-xs font-semibold text-danger">{err}</p>}
            <div className="flex gap-2">
              <button onClick={cancelar} disabled={busy} className="flex-1 rounded-full border border-line py-3 text-[14px] font-extrabold text-ink disabled:opacity-70">
                Cancelar
              </button>
              <button onClick={salvar} disabled={busy} className="flex-1 rounded-full bg-accent py-3 text-[14px] font-extrabold text-accent-ink disabled:opacity-70">
                {busy ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
