"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { signIn } from "@/auth";
import { consumirConvite } from "@/server/player-access.service";
import { isValidContact, normalizeContact } from "@/lib/contact";

export async function criarAcesso(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const token = String(formData.get("token") ?? "");
  const senha = String(formData.get("senha") ?? "");
  const confirmar = String(formData.get("confirmar") ?? "");
  const contatoRaw = String(formData.get("contato") ?? "");

  if (senha.length < 8) return "A senha precisa ter ao menos 8 caracteres.";
  if (senha !== confirmar) return "As senhas não conferem.";
  if (!isValidContact(contatoRaw)) return "Informe um e-mail válido ou telefone com DDD.";

  const contato = normalizeContact(contatoRaw);

  try {
    const hash = await bcrypt.hash(senha, 10);
    await consumirConvite(token, hash, contato);
  } catch (e) {
    return e instanceof Error ? e.message : "Não foi possível criar o acesso.";
  }

  try {
    await signIn("credentials", { email: contato, password: senha, redirectTo: "/inicio" });
  } catch (error) {
    if (error instanceof AuthError) return "Acesso criado, mas houve um erro ao entrar. Use a tela de login.";
    throw error; // redirect
  }
  return undefined;
}
