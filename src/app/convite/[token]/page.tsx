import Link from "next/link";
import { validarConvite } from "@/server/player-access.service";
import { ConviteClient } from "@/components/player/ConviteClient";

export const dynamic = "force-dynamic";

function LinkInvalido() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-8 text-center">
      <span className="flex h-[76px] w-[76px] items-center justify-center rounded-[26px] bg-danger/[.13] text-danger">
        <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />
        </svg>
      </span>
      <h1 className="mt-5 text-[23px] font-extrabold text-ink">Este link expirou</h1>
      <p className="mt-2 max-w-[300px] text-[13px] leading-relaxed text-muted">
        Links de convite valem por 7 dias. Peça um novo link à organização no WhatsApp — leva um minuto.
      </p>
      <Link href="/login" className="mt-6 text-[12.5px] font-semibold text-muted underline">
        Já tenho senha — entrar
      </Link>
    </div>
  );
}

export default async function ConvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const v = await validarConvite(token);

  if (!v.ok) return <LinkInvalido />;

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-base text-ink">
      <ConviteClient token={token} player={v.player} />
    </main>
  );
}
