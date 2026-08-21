import { z } from "zod";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.");

export const SuperCreateSchema = z
  .object({
    nome: z.string().trim().min(2, "Informe o nome do torneio.").max(80),
    data: dateStr,
    size: z.union([z.literal(8), z.literal(12), z.literal(16)]),
    courts: z.number().int().min(1, "Mínimo 1 quadra.").max(8),
    gamesPerMatch: z
      .number()
      .int("Use um número inteiro.")
      .min(3, "Mínimo 3 games.")
      .max(21, "Máximo 21 games.")
      .refine((v) => v % 2 === 1, "O total de games deve ser ímpar (evita empate)."),
    playerIds: z.array(z.string()).min(8).max(16),
  })
  .refine((v) => v.playerIds.length === v.size, {
    message: "Selecione exatamente a quantidade de atletas do formato.",
    path: ["playerIds"],
  })
  .refine((v) => new Set(v.playerIds).size === v.playerIds.length, {
    message: "Há atletas repetidos na seleção.",
    path: ["playerIds"],
  });

export type SuperCreateInput = z.infer<typeof SuperCreateSchema>;
