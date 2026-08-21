"use client";

import { useEffect, useRef, useState } from "react";

type Row = { nome: string; vitorias: number; saldo: number; gamesPro: number };

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

function primeiro(nome: string) {
  return nome.trim().split(/\s+/)[0];
}

/** Ajusta o tamanho da fonte até o texto caber em maxWidth. */
function fitFont(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  start: number,
  min: number,
  weight = 700,
): string {
  let size = start;
  while (size > min) {
    ctx.font = `${weight} ${size}px ${FONT}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return `${weight} ${size}px ${FONT}`;
}

function draw(canvas: HTMLCanvasElement, titulo: string, size: number, rows: Row[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = 1080;
  const H = 1080;

  // fundo
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0b2027");
  bg.addColorStop(1, "#0f2a30");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(540, 120, 60, 540, 340, 760);
  glow.addColorStop(0, "rgba(255,122,26,0.20)");
  glow.addColorStop(1, "rgba(255,122,26,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // título
  ctx.textAlign = "center";
  ctx.fillStyle = "#f3eee2";
  ctx.font = fitFont(ctx, titulo, 940, 62, 34, 800);
  ctx.fillText(titulo, 540, 100);
  ctx.fillStyle = "#ff9a4d";
  ctx.font = `700 27px ${FONT}`;
  ctx.fillText(`SUPER ${size}  ·  CLASSIFICAÇÃO DO DIA`, 540, 152);
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(180, 182);
  ctx.lineTo(900, 182);
  ctx.stroke();

  // pastilha "PÓDIO"
  ctx.fillStyle = "rgba(255,122,26,0.15)";
  const pillW = 150;
  roundRect(ctx, 540 - pillW / 2, 232, pillW, 44, 22);
  ctx.fill();
  ctx.fillStyle = "#ff9a4d";
  ctx.font = `800 22px ${FONT}`;
  ctx.fillText("PÓDIO", 540, 262);

  // blocos do pódio (esq→dir: 2º, 1º, 3º)
  const blockW = 250;
  const gap = 30;
  const startX = (W - (blockW * 3 + gap * 2)) / 2;
  const baseY = 740;
  const podium = [
    { row: rows[1], rank: 2, x: startX, h: 280, color: "#c7ccd1", dark: "#2b2f34" },
    { row: rows[0], rank: 1, x: startX + blockW + gap, h: 360, color: "#f4c430", dark: "#4a3a05" },
    { row: rows[2], rank: 3, x: startX + (blockW + gap) * 2, h: 230, color: "#d48a4e", dark: "#3a2412" },
  ];

  for (const p of podium) {
    if (!p.row) continue;
    const top = baseY - p.h;
    const cx = p.x + blockW / 2;

    // nome acima
    ctx.fillStyle = "#f3eee2";
    ctx.font = fitFont(ctx, primeiro(p.row.nome), blockW + 10, 34, 20, 800);
    ctx.fillText(primeiro(p.row.nome), cx, top - 54);

    // medalha
    ctx.beginPath();
    ctx.arc(cx, top - 20, 24, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.fillStyle = p.dark;
    ctx.font = `900 26px ${FONT}`;
    ctx.fillText(String(p.rank), cx, top - 11);

    // bloco
    const grad = ctx.createLinearGradient(0, top, 0, baseY);
    grad.addColorStop(0, p.color);
    grad.addColorStop(1, shade(p.color, -0.25));
    roundRect(ctx, p.x, top, blockW, p.h, 20);
    ctx.fillStyle = grad;
    ctx.fill();

    // stats dentro do bloco
    ctx.fillStyle = p.dark;
    ctx.font = `900 52px ${FONT}`;
    ctx.fillText(`${p.row.vitorias}`, cx, top + 76);
    ctx.font = `800 22px ${FONT}`;
    ctx.fillText("VITÓRIAS", cx, top + 104);
    ctx.font = `700 26px ${FONT}`;
    const sg = `${p.row.saldo >= 0 ? "+" : ""}${p.row.saldo}`;
    ctx.fillText(`SG ${sg}  ·  ${p.row.gamesPro} games`, cx, top + p.h - 30);
  }

  // lista 4º em diante (até caber)
  let y = 800;
  const restantes = rows.slice(3);
  const maxLinhas = 5;
  ctx.textAlign = "left";
  restantes.slice(0, maxLinhas).forEach((r, i) => {
    const pos = i + 4;
    ctx.fillStyle = "#8fa9ae";
    ctx.font = `800 24px ${FONT}`;
    ctx.fillText(`${pos}.`, 150, y);
    ctx.fillStyle = "#f3eee2";
    ctx.font = fitFont(ctx, r.nome, 500, 24, 18, 600);
    ctx.fillText(r.nome, 196, y);
    ctx.textAlign = "right";
    ctx.fillStyle = "#8fa9ae";
    ctx.font = `700 22px ${FONT}`;
    const sg = `${r.saldo >= 0 ? "+" : ""}${r.saldo}`;
    ctx.fillText(`${r.vitorias}V · ${sg} · ${r.gamesPro}`, 930, y);
    ctx.textAlign = "left";
    y += 40;
  });
  if (restantes.length > maxLinhas) {
    ctx.fillStyle = "#5f7d82";
    ctx.font = `600 22px ${FONT}`;
    ctx.fillText(`+ ${restantes.length - maxLinhas} atletas`, 150, y + 2);
  }

  // rodapé
  ctx.textAlign = "center";
  ctx.fillStyle = "#5f7d82";
  ctx.font = `800 24px ${FONT}`;
  ctx.fillText("ELITE BEACH RANKING", 540, 1040);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + Math.round(255 * amt)));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + Math.round(255 * amt)));
  const b = Math.max(0, Math.min(255, (n & 255) + Math.round(255 * amt)));
  return `rgb(${r},${g},${b})`;
}

export function SuperPodium({
  titulo,
  size,
  standings,
}: {
  titulo: string;
  size: number;
  standings: Row[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (canvasRef.current) draw(canvasRef.current, titulo, size, standings);
  }, [titulo, size, standings]);

  async function compartilhar() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setMsg(null);
    setBusy(true);
    canvas.toBlob(async (blob) => {
      setBusy(false);
      if (!blob) {
        setMsg("Não foi possível gerar a imagem.");
        return;
      }
      const file = new File([blob], `podio-${titulo}.png`, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: titulo });
          return;
        } catch {
          /* cancelou → cai para download */
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
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        width={1080}
        height={1080}
        className="w-full rounded-2xl border border-line"
      />
      <button
        onClick={compartilhar}
        disabled={busy}
        className="rounded-xl bg-accent py-3 text-sm font-bold text-accent-ink disabled:opacity-70"
      >
        {busy ? "Gerando…" : "Compartilhar pódio (imagem)"}
      </button>
      {msg && <p className="text-center text-xs text-muted">{msg}</p>}
    </div>
  );
}
