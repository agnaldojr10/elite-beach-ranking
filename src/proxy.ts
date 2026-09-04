import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Next 16 renomeou "middleware" para "proxy". Roda no edge, usando só o
// authConfig (sem Prisma/bcrypt). O redirect de login vem do callback
// `authorized` em auth.config.ts.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // Protege as páginas, mas libera a API de auth/health e QUALQUER arquivo
  // estático (com extensão): logo.svg, sw.js, manifest.webmanifest, ícones…
  matcher: ["/((?!api/auth|api/health|api/version|_next/static|_next/image|.*\\..*).*)"],
};
