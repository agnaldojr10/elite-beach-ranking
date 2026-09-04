import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Versão atual do deploy (para o app detectar nova versão e atualizar sozinho).
export function GET(): NextResponse {
  const v = process.env.VERCEL_GIT_COMMIT_SHA || "dev";
  return NextResponse.json({ v }, { headers: { "Cache-Control": "no-store" } });
}
