import { z } from "zod";

export const PlayerInputSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do jogador.").max(80),
  email: z.string().trim().email("E-mail inválido.").optional().or(z.literal("")),
  type: z.enum(["REGULAR", "GUEST"]),
});

export type PlayerInput = z.infer<typeof PlayerInputSchema>;
