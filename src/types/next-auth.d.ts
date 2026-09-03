import type { DefaultSession } from "next-auth";

export type AppRole = "ADMIN" | "PLAYER";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
      playerId: string | null;
    } & DefaultSession["user"];
  }
  interface User {
    role?: AppRole;
    playerId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: AppRole;
    playerId?: string | null;
  }
}
