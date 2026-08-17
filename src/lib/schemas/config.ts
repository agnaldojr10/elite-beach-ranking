import { z } from "zod";

const pts = z.number().int().min(0).max(100000);

export const ScoringSchema = z.object({
  ptsParticipacao: pts,
  ptsQuartas: pts,
  pts4: pts,
  pts3: pts,
  ptsVice: pts,
  ptsCampeao: pts,
});
export type ScoringInput = z.infer<typeof ScoringSchema>;

export const PasswordChangeSchema = z.object({
  atual: z.string().min(1, "Informe a senha atual."),
  nova: z.string().min(6, "A nova senha deve ter ao menos 6 caracteres.").max(100),
});
export type PasswordChangeInput = z.infer<typeof PasswordChangeSchema>;

export const AdminSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome.").max(80),
  email: z.string().trim().email("E-mail inválido."),
  senha: z.string().min(6, "A senha deve ter ao menos 6 caracteres.").max(100),
});
export type AdminInput = z.infer<typeof AdminSchema>;
