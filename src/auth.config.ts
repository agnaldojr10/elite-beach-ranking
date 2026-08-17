import type { NextAuthConfig } from "next-auth";

/**
 * Config edge-safe (sem Prisma/bcrypt) — usada pelo middleware.
 * Os providers ficam em auth.ts (runtime Node).
 */
export const authConfig = {
  trustHost: true, // confia no host da plataforma (Vercel) — evita UntrustedHost
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // Protege tudo, exceto a própria tela de login.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLogin = nextUrl.pathname.startsWith("/login");
      if (isOnLogin) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }
      return isLoggedIn;
    },
  },
  providers: [], // preenchidos em auth.ts
} satisfies NextAuthConfig;
