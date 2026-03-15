"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export async function loginAction(formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Email ou senha incorretos" };
        default:
          return { error: "Erro ao conectar. Tente novamente." };
      }
    }
    // NEXT_REDIRECT is thrown by signIn on success — rethrow it
    throw error;
  }
}
