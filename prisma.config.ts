import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7: as URLs de conexão saíram do schema.prisma e vêm para cá.
// A CLI (migrate/introspect) usa a conexão DIRETA (sem pooler).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL,
  },
});
