"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthCard, AuthError } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { resetPassword } from "@/services/password-reset";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="h-14 w-14 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
            <AlertCircle className="h-7 w-7 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-sm text-muted-foreground">
            Link inválido. Solicite um novo link de recuperação.
          </p>
        </div>
        <Button className="w-full h-10 font-medium" asChild>
          <Link href="/forgot-password">Solicitar novo link</Link>
        </Button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("token", token!);

    const result = await resetPassword(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-950/40 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-sm font-medium">Senha redefinida com sucesso!</p>
          <p className="text-sm text-muted-foreground">
            Agora você pode entrar com sua nova senha.
          </p>
        </div>
        <Button className="w-full h-10 font-medium" asChild>
          <Link href="/login">Ir para o login</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <AuthError message={error} />}
      <p className="text-sm text-muted-foreground">
        Crie uma nova senha para sua conta (mínimo 6 caracteres).
      </p>
      <div className="space-y-2">
        <Label htmlFor="password">Nova senha</Label>
        <PasswordInput
          id="password"
          name="password"
          placeholder="Mínimo 6 caracteres"
          className="h-10"
          minLength={6}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          placeholder="Repita a nova senha"
          className="h-10"
          minLength={6}
          required
        />
      </div>
      <Button type="submit" className="w-full h-10 font-medium" disabled={loading}>
        {loading ? "Redefinindo..." : "Redefinir senha"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Redefinir senha"
      description="Use o link que enviamos por email"
      logoHref="/login"
    >
      <Suspense fallback={<div className="text-center text-sm text-muted-foreground py-4">Carregando...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthCard>
  );
}
