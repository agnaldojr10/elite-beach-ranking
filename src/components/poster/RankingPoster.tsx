"use client";

import { useEffect, useRef, useState } from "react";
import { drawAvatar, drawBeachBackground, fitFont, FONT, loadImages, roundRect, shade } from "./canvas-utils";

type Row = { posicao: number; nome: string; photoUrl: string | null; pontos: number };

const W = 1080;
const MEDAL = ["#c7ccd1", "#f4c430", "#d48a4e"]; // ordem visual: 2º,1º,3º
const MEDAL_DARK = ["#2b2f34", "#4a3a05", "#3a2412"];

function draw(canvas: HTMLCanvasElement, titulo: string, rows: Row[], photos: Map<string, HTMLImageElement>, H: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  drawBeachBackground(ctx, W, H);

  // cabeçalho
  ctx.textAlign = "center";
  ctx.fillStyle = "#ff9a4d";
  ctx.font = `800 40px ${FONT}`;
  ctx.fillText("RANKING GERAL", W / 2, 95);
  ctx.fillStyle = "#f3eee2";
  ctx.font = fitFont(ctx, titulo, 960, 46, 26, 800);
  ctx.fillText(titulo, W / 2, 152);
  ctx.fillStyle = "#8fa9ae";
  ctx.font = `700 24px ${FONT}`;
  ctx.fillText(`${rows.length} atletas`, W / 2, 190);

  // pódio (2º, 1º, 3º)
  const top3 = rows.slice(0, 3);
  const order = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3;
  const blockW = 240;
  const gap = 28;
  const startX = (W - (blockW * 3 + gap * 2)) / 2;
  const baseY = 770;
  const heights = [250, 320, 210];
  order.forEach((r, i) => {
    if (!r) return;
    const x = startX + i * (blockW + gap);
    const cx = x + blockW / 2;
    const top = baseY - heights[i];
    const rank = r.posicao;
    const big = i === 1;
    const rr = big ? 66 : 54;
    // avatar
    drawAvatar(ctx, r.photoUrl ? photos.get(r.photoUrl) : null, cx, top - 76, rr, r.nome, MEDAL[i]);
    // nome
    ctx.fillStyle = "#f3eee2";
    ctx.font = fitFont(ctx, r.nome.split(" ")[0], blockW + 10, 30, 18, 800);
    ctx.fillText(r.nome.split(" ")[0], cx, top - 4);
    // bloco
    const grad = ctx.createLinearGradient(0, top, 0, baseY);
    grad.addColorStop(0, MEDAL[i]);
    grad.addColorStop(1, shade(MEDAL[i], -0.28));
    roundRect(ctx, x, top, blockW, heights[i], 20);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.fillStyle = MEDAL_DARK[i];
    ctx.font = `900 ${big ? 56 : 46}px ${FONT}`;
    ctx.fillText(`${rank}º`, cx, top + (big ? 80 : 70));
    ctx.font = `800 30px ${FONT}`;
    ctx.fillText(`${r.pontos} pts`, cx, top + heights[i] - 34);
  });

  // lista 4º em diante
  let y = 830;
  const rowH = 72;
  for (let idx = 3; idx < rows.length; idx++) {
    const r = rows[idx];
    const ry = y;
    roundRect(ctx, 60, ry, W - 120, rowH - 12, 18);
    ctx.fillStyle = "rgba(255,255,255,0.045)";
    ctx.fill();
    ctx.textAlign = "left";
    ctx.fillStyle = "#8fa9ae";
    ctx.font = `900 26px ${FONT}`;
    ctx.fillText(String(r.posicao), 92, ry + 40);
    drawAvatar(ctx, r.photoUrl ? photos.get(r.photoUrl) : null, 168, ry + 30, 26, r.nome);
    ctx.fillStyle = "#f3eee2";
    ctx.font = fitFont(ctx, r.nome, 560, 27, 18, 700);
    ctx.fillText(r.nome, 208, ry + 40);
    ctx.textAlign = "right";
    ctx.fillStyle = "#f3eee2";
    ctx.font = `900 30px ${FONT}`;
    ctx.fillText(`${r.pontos}`, W - 92, ry + 40);
    ctx.textAlign = "left";
    y += rowH;
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#5f7d82";
  ctx.font = `800 24px ${FONT}`;
  ctx.fillText("RANKING ELITE BEACH", W / 2, H - 44);
}

export function RankingPoster({ titulo, rows }: { titulo: string; rows: Row[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const H = 830 + Math.max(0, rows.length - 3) * 72 + 90;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let cancelled = false;
    (async () => {
      const photos = await loadImages(rows.map((r) => r.photoUrl));
      if (!cancelled) draw(canvas, titulo, rows, photos, H);
    })();
    return () => {
      cancelled = true;
    };
  }, [titulo, rows, H]);

  function share() {
    const canvas = ref.current;
    if (!canvas) return;
    setMsg(null);
    setBusy(true);
    canvas.toBlob(async (blob) => {
      setBusy(false);
      if (!blob) return setMsg("Não foi possível gerar a imagem.");
      const file = new File([blob], "ranking.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: titulo });
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
        {busy ? "Gerando…" : "Compartilhar imagem do ranking"}
      </button>
      {msg && <p className="text-center text-[11px] text-muted">{msg}</p>}
    </div>
  );
}
