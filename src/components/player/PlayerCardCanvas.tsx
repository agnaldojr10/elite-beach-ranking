"use client";

import { useEffect, useRef, useState } from "react";

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

export type CardData = {
  nome: string;
  clube: string | null;
  posicao: number | null;
  vitorias: number;
  saldo: number;
  gamesPro: number;
  pontos: number;
  titulos: number;
  podios: number;
  photoUrl?: string | null;
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
  }
}
const initials = (nome: string) => {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
};

function draw(canvas: HTMLCanvasElement, d: CardData, img?: HTMLImageElement | null) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = 1080;
  const H = 1350;

  // moldura (borda gradiente laranja→ouro)
  const frame = ctx.createLinearGradient(0, 0, W, H);
  frame.addColorStop(0, "#ff7a1a");
  frame.addColorStop(0.5, "#f4c430");
  frame.addColorStop(1, "rgba(255,255,255,.10)");
  ctx.fillStyle = frame;
  roundRect(ctx, 24, 24, W - 48, H - 48, 44);
  ctx.fill();

  // interior
  const inner = ctx.createLinearGradient(0, 40, 0, H);
  inner.addColorStop(0, "#123a42");
  inner.addColorStop(1, "#0c2126");
  ctx.fillStyle = inner;
  roundRect(ctx, 40, 40, W - 80, H - 80, 34);
  ctx.fill();

  const PAD = 90;
  ctx.textAlign = "left";
  ctx.fillStyle = "#ff9a4d";
  ctx.font = `800 26px ${FONT}`;
  ctx.fillText("RANKING ELITE BEACH", PAD, 130);
  ctx.fillStyle = "#8fa9ae";
  ctx.font = `700 22px ${FONT}`;
  ctx.fillText("TEMPORADA 2026", PAD, 165);

  // posição
  ctx.textAlign = "right";
  ctx.fillStyle = "#ff7a1a";
  ctx.font = `900 96px ${FONT}`;
  ctx.fillText(d.posicao ? `#${d.posicao}` : "—", W - PAD, 155);
  ctx.fillStyle = "#8fa9ae";
  ctx.font = `800 20px ${FONT}`;
  ctx.fillText("RANKING", W - PAD, 190);

  // foto (placeholder com iniciais)
  const fx = PAD, fy = 220, fw = W - PAD * 2, fh = 470;
  ctx.fillStyle = "#0f2a30";
  roundRect(ctx, fx, fy, fw, fh, 28);
  ctx.fill();
  ctx.save();
  roundRect(ctx, fx, fy, fw, fh, 28);
  ctx.clip();
  if (img && img.complete && img.naturalWidth > 0) {
    // cobre a área mantendo proporção (object-cover)
    const scale = Math.max(fw / img.naturalWidth, fh / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, fx + (fw - dw) / 2, fy + (fh - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = "#1a4048";
    ctx.font = `900 200px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(initials(d.nome), W / 2, fy + fh / 2 + 70);
  }
  ctx.restore();

  // nome
  ctx.textAlign = "left";
  ctx.fillStyle = "#f3eee2";
  ctx.font = `900 58px ${FONT}`;
  const nomeUp = d.nome.toUpperCase();
  ctx.fillText(nomeUp, PAD, 780, W - PAD * 2);
  ctx.fillStyle = "#8fa9ae";
  ctx.font = `600 24px ${FONT}`;
  ctx.fillText(d.clube ?? "Elite Beach", PAD, 818);

  // atributos
  const attrs: [string, string, string][] = [
    ["V", String(d.vitorias), "#f3eee2"],
    ["SG", `${d.saldo >= 0 ? "+" : ""}${d.saldo}`, "#4cc38a"],
    ["GP", String(d.gamesPro), "#f3eee2"],
    ["PTS", d.pontos.toLocaleString("pt-BR"), "#ff7a1a"],
  ];
  const gap = 22;
  const bw = (W - PAD * 2 - gap * 3) / 4;
  const by = 880;
  attrs.forEach(([label, val, color], i) => {
    const bx = PAD + i * (bw + gap);
    const isPts = i === 3;
    ctx.fillStyle = isPts ? "rgba(255,122,26,.14)" : "rgba(255,255,255,.05)";
    roundRect(ctx, bx, by, bw, 150, 20);
    ctx.fill();
    if (isPts) {
      ctx.strokeStyle = "rgba(255,122,26,.35)";
      ctx.lineWidth = 2;
      roundRect(ctx, bx, by, bw, 150, 20);
      ctx.stroke();
    }
    ctx.textAlign = "center";
    ctx.fillStyle = color;
    ctx.font = `900 52px ${FONT}`;
    ctx.fillText(val, bx + bw / 2, by + 88);
    ctx.fillStyle = "#8fa9ae";
    ctx.font = `800 22px ${FONT}`;
    ctx.fillText(label, bx + bw / 2, by + 124);
  });

  // troféus + rodapé
  ctx.textAlign = "center";
  ctx.fillStyle = "#8fa9ae";
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText(`🏆 ${d.titulos} título(s)   ·   🥇 ${d.podios} pódio(s)`, W / 2, 1120);
  ctx.fillStyle = "#5f7d82";
  ctx.font = `800 22px ${FONT}`;
  ctx.fillText("RANKING ELITE BEACH", W / 2, 1250);
}

export function PlayerCardCanvas({ data, onPhotoClick }: { data: CardData; onPhotoClick?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    draw(canvas, data);
    if (data.photoUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => draw(canvas, data, img);
      img.onerror = () => {};
      img.src = data.photoUrl;
    }
  }, [data]);

  function compartilhar() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setMsg(null);
    setBusy(true);
    canvas.toBlob(async (blob) => {
      setBusy(false);
      if (!blob) return setMsg("Não foi possível gerar a imagem.");
      const file = new File([blob], `card-${data.nome}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: data.nome });
          return;
        } catch {
          /* cancelou → download */
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
      <canvas
        ref={canvasRef}
        width={1080}
        height={1350}
        onClick={onPhotoClick}
        className={`w-full rounded-[24px] border border-line ${onPhotoClick ? "cursor-zoom-in" : ""}`}
      />
      <button
        onClick={compartilhar}
        disabled={busy}
        className="rounded-full bg-accent py-3.5 text-center text-[14px] font-extrabold text-accent-ink disabled:opacity-70"
      >
        {busy ? "Gerando…" : "Compartilhar meu card"}
      </button>
      {msg && <p className="text-center text-[11px] text-muted">{msg}</p>}
    </div>
  );
}
