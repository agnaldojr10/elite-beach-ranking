"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Atualiza a tela periodicamente (para o "ao vivo"). */
export function LiveRefresher({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
