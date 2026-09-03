"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export async function entrarAtleta(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/inicio",
    });
  } catch (error) {
    if (error instanceof AuthError) return "E-mail/telefone ou senha inválidos.";
    throw error; // redirect
  }
  return undefined;
}
