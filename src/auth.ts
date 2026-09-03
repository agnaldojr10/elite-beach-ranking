import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { normalizeContact } from "@/lib/contact";

const CredentialsSchema = z.object({
  email: z.string().min(1), // identificador: e-mail (admin) ou e-mail/telefone (atleta)
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const parsed = CredentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const id = email.trim();

        // 1) admin (por e-mail)
        const admin = await prisma.admin.findUnique({ where: { email: id.toLowerCase() } });
        if (admin) {
          const ok = await bcrypt.compare(password, admin.passwordHash);
          if (!ok) return null;
          return { id: admin.id, name: admin.nome, email: admin.email, role: "ADMIN" as const };
        }

        // 2) atleta (por contato de login normalizado)
        const player = await prisma.player.findUnique({
          where: { loginContact: normalizeContact(id) },
        });
        if (player?.passwordHash && player.active) {
          const ok = await bcrypt.compare(password, player.passwordHash);
          if (!ok) return null;
          return { id: player.id, name: player.nome, role: "PLAYER" as const, playerId: player.id };
        }

        return null;
      },
    }),
  ],
});
