import type { NextConfig } from "next";

// Identificador do build (commit da Vercel) exposto ao cliente para detectar
// novas versões e atualizar o app automaticamente (sem F5 manual).
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA || "dev";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },
};

export default nextConfig;
