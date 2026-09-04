export const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + Math.round(255 * amt)));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + Math.round(255 * amt)));
  const b = Math.max(0, Math.min(255, (n & 255) + Math.round(255 * amt)));
  return `rgb(${r},${g},${b})`;
}

export function fitFont(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, start: number, min: number, weight = 800): string {
  let size = start;
  while (size > min) {
    ctx.font = `${weight} ${size}px ${FONT}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return `${weight} ${size}px ${FONT}`;
}

export function initials(nome: string): string {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase();
}

export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function loadImages(urls: (string | null | undefined)[]): Promise<Map<string, HTMLImageElement>> {
  const uniq = [...new Set(urls.filter((u): u is string => !!u))];
  const map = new Map<string, HTMLImageElement>();
  await Promise.all(
    uniq.map(async (u) => {
      const img = await loadImage(u);
      if (img) map.set(u, img);
    }),
  );
  return map;
}

/** Avatar circular: foto (cover) ou iniciais; com anel opcional. */
export function drawAvatar(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null | undefined,
  cx: number,
  cy: number,
  r: number,
  nome: string,
  ring?: string,
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (img && img.naturalWidth > 0) {
    const s = Math.max((2 * r) / img.naturalWidth, (2 * r) / img.naturalHeight);
    const dw = img.naturalWidth * s;
    const dh = img.naturalHeight * s;
    ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  } else {
    ctx.fillStyle = "#164049";
    ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    ctx.fillStyle = "#7fc6d1";
    ctx.font = `800 ${Math.round(r * 0.8)}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials(nome), cx, cy + 1);
    ctx.textBaseline = "alphabetic";
  }
  ctx.restore();
  if (ring) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = ring;
    ctx.lineWidth = 5;
    ctx.stroke();
  }
}

export function drawBeachBackground(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0b2027");
  bg.addColorStop(1, "#0f2a30");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 90, 40, W / 2, 320, 760);
  glow.addColorStop(0, "rgba(255,122,26,0.20)");
  glow.addColorStop(1, "rgba(255,122,26,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, 700);
}
