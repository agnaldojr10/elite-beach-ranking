"use client";

import { useState } from "react";
import { PlayerCardCanvas, type CardData } from "@/components/player/PlayerCardCanvas";

export function AthleteCard({ data }: { data: CardData }) {
  const [zoom, setZoom] = useState(false);
  const canZoom = !!data.photoUrl;

  return (
    <>
      <PlayerCardCanvas data={data} onPhotoClick={canZoom ? () => setZoom(true) : undefined} />
      {canZoom && (
        <p className="mt-1 text-center text-[11px] text-muted">Toque no card para ver a foto</p>
      )}
      {zoom && data.photoUrl && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoom(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data.photoUrl} alt="" className="max-h-full max-w-full rounded-2xl object-contain" />
          <button className="absolute right-5 top-6 text-2xl font-bold text-white/80" aria-label="Fechar">
            ✕
          </button>
        </div>
      )}
    </>
  );
}
