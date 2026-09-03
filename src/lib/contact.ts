/**
 * Normaliza o contato de login do atleta: e-mail (minúsculo) ou telefone
 * (só dígitos). Usado no cadastro de acesso e no login para casar o mesmo valor.
 */
export function normalizeContact(s: string): string {
  const t = s.trim();
  if (t.includes("@")) return t.toLowerCase();
  return t.replace(/\D/g, "");
}

/** Validação leve: e-mail plausível OU telefone com 10–11 dígitos. */
export function isValidContact(s: string): boolean {
  const t = s.trim();
  if (t.includes("@")) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
  const digits = t.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13;
}
