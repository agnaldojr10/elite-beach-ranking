import { z } from "zod";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.");
const pts = z.number().int("Use um número inteiro.").min(0, "Não pode ser negativo.").max(100000);
const urlOpt = z.string().url("URL inválida.").optional().or(z.literal("")).nullable();

export const ChampionshipInputSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome.").max(80),
  temporada: z.string().trim().min(1, "Informe a temporada.").max(40),
  formato: z.string().trim().min(1, "Informe o formato.").max(80),
  inicio: dateStr,
  fim: dateStr,
  finalsDate: dateStr,
  bannerUrl: urlOpt,
  logoUrl: urlOpt,
  // pontuação por campeonato
  ptsParticipacao: pts,
  ptsQuartas: pts,
  pts4: pts,
  pts3: pts,
  ptsVice: pts,
  ptsCampeao: pts,
  lastRoundDouble: z.boolean(),
});
export type ChampionshipInput = z.infer<typeof ChampionshipInputSchema>;

export const GenerateRoundsSchema = z.object({
  qtd: z.number().int().min(1, "Mínimo 1 rodada.").max(30),
  inicio: dateStr,
});
export type GenerateRoundsInput = z.infer<typeof GenerateRoundsSchema>;
