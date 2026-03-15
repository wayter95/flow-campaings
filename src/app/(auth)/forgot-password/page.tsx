"use client";

import { AuthCard, AuthError } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/services/password-reset";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await requestPasswordReset(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  return (
    <AuthCard
      title={sent ? "Verifique seu email" : "Recuperar senha"}
      description={
        sent
          ? "Se existe uma conta com esse email, enviamos um link para redefinir sua senha."
          : "Informe seu email e enviaremos um link para redefinir."
      }
      logoHref="/login"
      footer={
        !sent ? (
          <p className="text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-primary hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              Voltar para o login
            </Link>
          </p>
        ) : undefined
      }
    >
      {sent ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm text-muted-foreground">
              Verifique sua caixa de entrada e a pasta de spam.
            </p>
          </div>
          <Button variant="outline" className="w-full h-10 font-medium">
            <Link href="/login" className="inline-flex items-center justify-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar para o login
            </Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <AuthError message={error} />}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                className="pl-10 h-10"
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full h-10 font-medium" disabled={loading}>
            {loading ? "Enviando..." : "Enviar link de recuperação"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
