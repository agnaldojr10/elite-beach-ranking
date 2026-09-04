import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export const runtime = "nodejs";

const MAX = 4 * 1024 * 1024; // 4 MB (limite do serverless)

// Upload de imagens pelo servidor (evita CORS do upload direto do cliente).
export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Armazenamento (Blob) não configurado." }, { status: 500 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Envio inválido." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Arquivo ausente." }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Envie uma imagem." }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "Imagem acima de 4 MB." }, { status: 413 });

  try {
    const safe = (file.name || "imagem").replace(/[^\w.\-]+/g, "_");
    const bytes = Buffer.from(await file.arrayBuffer());
    const blob = await put(`uploads/${safe}`, bytes, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return NextResponse.json({ url: blob.url });
  } catch (e) {
    return NextResponse.json(
      { error: "Falha ao enviar a imagem.", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
