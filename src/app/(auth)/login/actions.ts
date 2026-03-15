"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export async function loginAction(
  _prevState: { error: string } | null,
  formData: FormData,
) {
  try {
    console.log("[login] calling signIn...");
    await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirectTo: "/",
    });
    console.log("[login] signIn returned (should not reach here)");
  } catch (error) {
    console.log("[login] signIn threw:", error?.constructor?.name, String(error));
    if (isRedirectError(error)) {
      console.log("[login] rethrowing NEXT_REDIRECT");
      throw error;
    }
    if (error instanceof AuthError) {
      return { error: "Email ou senha incorretos" };
    }
    // Rethrow unknown errors
    throw error;
  }
  return null;
}
