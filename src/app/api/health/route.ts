import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Endpoint público de saúde. O keep-alive (GitHub Actions) chama isto a cada
// ~5 min para manter o Neon acordado e evitar cold start ao lançar placares.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
