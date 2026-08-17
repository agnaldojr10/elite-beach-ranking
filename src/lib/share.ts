/** Compartilha um texto: usa o share nativo (mobile) ou cai no WhatsApp Web. */
export async function shareText(text: string) {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ text });
      return;
    } catch {
      /* usuário cancelou ou indisponível → segue para o WhatsApp */
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}
