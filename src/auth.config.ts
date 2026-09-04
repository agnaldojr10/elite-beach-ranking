import type { NextAuthConfig } from "next-auth";

// Rotas exclusivas do atleta (visão do jogador). O restante protegido é admin.
const PLAYER_PREFIXES = [
  "/inicio",
  "/classificacao",
  "/desempenho",
  "/rodada",
  "/card",
  "/perfil",
  "/jogo-agora",
  "/atleta",
];

const isPlayerRoute = (pathname: string) =>
  PLAYER_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));

/**
 * Config edge-safe (sem Prisma/bcrypt) — usada pelo proxy.
 * Os providers ficam em auth.ts (runtime Node).
 */
export const authConfig = {
  trustHost: true,
  pages: { signIn: "/login" },
  callbacks: {
    // Carrega papel/atleta no token e na sessão (edge-safe).
    jwt({ token, user }) {
      if (user) {
        const u = user as { role?: "ADMIN" | "PLAYER"; playerId?: string | null };
        const t = token as Record<string, unknown>;
        t.role = u.role ?? "ADMIN";
        t.playerId = u.playerId ?? null;
      }
      return token;
    },
    session({ session, token }) {
      const t = token as { sub?: string; role?: "ADMIN" | "PLAYER"; playerId?: string | null };
      if (session.user) {
        session.user.id = t.sub ?? "";
        session.user.role = t.role ?? "ADMIN";
        session.user.playerId = t.playerId ?? null;
      }
      return session;
    },
    // Autorização + roteamento por papel.
    authorized({ auth, request: { nextUrl } }) {
      const { pathname } = nextUrl;
      const isLoggedIn = !!auth?.user;
      const isPlayer = auth?.user?.role === "PLAYER";

      const isAuthPage =
        pathname.startsWith("/login") ||
        pathname.startsWith("/convite");

      if (isAuthPage) {
        if (isLoggedIn) return Response.redirect(new URL(isPlayer ? "/inicio" : "/", nextUrl));
        return true;
      }

      if (!isLoggedIn) return false;

      // rotas de API (ex.: upload de imagem) não entram no gating por papel —
      // os próprios handlers validam a sessão.
      if (pathname.startsWith("/api/")) return true;

      const onPlayerRoute = isPlayerRoute(pathname);
      // atleta só acessa a área do atleta; admin não acessa a área do atleta.
      if (isPlayer && !onPlayerRoute) return Response.redirect(new URL("/inicio", nextUrl));
      if (!isPlayer && onPlayerRoute) return Response.redirect(new URL("/", nextUrl));
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
