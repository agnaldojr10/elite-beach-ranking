"use client";

import { useEffect, useRef, useState } from "react";
import { drawAvatar, drawBeachBackground, fitFont, FONT, loadImages, roundRect, shade } from "./canvas-utils";

type Item = { tierLabel: string; pts: number; nomes: string[]; photos: (string | null)[] };

const W = 1080;
const H = 1080;
const MEDAL = ["#c7ccd1", "#f4c430", "#d48a4e"]; // 2º,1º,3º
const MEDAL_DARK = ["#2b2f34", "#4a3a05", "#3a2412"];
const primeiro = (n: string) => n.split(" ")[0];

function draw(canvas: HTMLCanvasElement, numero: number | null, itens: Item[], photos: Map<string, HTMLImageElement>) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  drawBeachBackground(ctx, W, H);

  ctx.textAlign = "center";
  ctx.fillStyle = "#ff9a4d";
  ctx.font = `800 40px ${FONT}`;
  ctx.fillText("PÓDIO DA RODADA", W / 2, 120);
  ctx.fillStyle = "#f3eee2";
  ctx.font = `900 60px ${FONT}`;
  ctx.fillText(numero != null ? `Rodada ${numero}` : "Rodada", W / 2, 195);

  const campeao = itens[0];
  const vice = itens[1];
  const terceiro = itens[2];
  const order = [vice, campeao, terceiro]; // visual: 2º,1º,3º

  const blockW = 300;
  const gap = 24;
  const startX = (W - (blockW * 3 + gap * 2)) / 2;
  const baseY = 900;
  const heights = [300, 380, 250];

  order.forEach((it, i) => {
    if (!it) return;
    const x = startX + i * (blockW + gap);
    const cx = x + blockW / 2;
    const top = baseY - heights[i];
    const r = i === 1 ? 60 : 52;

    // dupla: dois avatares sobrepostos
    const off = r - 14;
    drawAvatar(ctx, it.photos[0] ? photos.get(it.photos[0]!) : null, cx - off, top - 92, r, it.nomes[0] ?? "", MEDAL[i]);
    if (it.nomes[1]) {
      drawAvatar(ctx, it.photos[1] ? photos.get(it.photos[1]!) : null, cx + off, top - 92, r, it.nomes[1], MEDAL[i]);
    }

    // nomes
    ctx.fillStyle = "#f3eee2";
    const label = it.nomes.map(primeiro).join(" & ");
    ctx.font = fitFont(ctx, label, blockW + 6, 30, 17, 800);
    ctx.fillText(label, cx, top - 6);

    // bloco
    const grad = ctx.createLinearGradient(0, top, 0, baseY);
    grad.addColorStop(0, MEDAL[i]);
    grad.addColorStop(1, shade(MEDAL[i], -0.28));
    roundRect(ctx, x, top, blockW, heights[i], 22);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.fillStyle = MEDAL_DARK[i];
    ctx.font = `900 ${i === 1 ? 40 : 34}px ${FONT}`;
    ctx.fillText(it.tierLabel.toUpperCase(), cx, top + (i === 1 ? 74 : 62));
    ctx.font = `800 30px ${FONT}`;
    ctx.fillText(`+${it.pts} pts`, cx, top + heights[i] - 36);
  });

  ctx.textAlign = "center";
  ctx.fillStyle = "#5f7d82";
  ctx.font = `800 24px ${FONT}`;
  ctx.fillText("RANKING ELITE BEACH", W / 2, H - 44);
}

export function RoundPodiumPoster({ numero, itens }: { numero: number | null; itens: Item[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let cancelled = false;
    (async () => {
      const photos = await loadImages(itens.flatMap((i) => i.photos));
      if (!cancelled) draw(canvas, numero, itens, photos);
    })();
    return () => {
      cancelled = true;
    };
  }, [numero, itens]);

  function share() {
    const canvas = ref.current;
    if (!canvas) return;
    setMsg(null);
    setBusy(true);
    canvas.toBlob(async (blob) => {
      setBusy(false);
      if (!blob) return setMsg("Não foi possível gerar a imagem.");
      const file = new File([blob], `podio-rodada-${numero ?? ""}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `Pódio · Rodada ${numero ?? ""}` });
          return;
        } catch {
          /* cancelou */
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
      setMsg("Imagem baixada.");
    }, "image/png");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-[24px] border border-line">
        <canvas ref={ref} width={W} height={H} className="w-full animate-[posterIn_.6s_ease]" />
        <div className="pointer-events-none absolute inset-0 animate-[posterShine_1.1s_ease] bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,.14)_50%,transparent_65%)]" />
      </div>
      <button
        onClick={share}
        disabled={busy}
        className="rounded-full bg-accent py-3.5 text-center text-[14px] font-extrabold text-accent-ink disabled:opacity-70"
      >
        {busy ? "Gerando…" : "Compartilhar pódio (imagem)"}
      </button>
      {msg && <p className="text-center text-[11px] text-muted">{msg}</p>}
    </div>
  );
}
