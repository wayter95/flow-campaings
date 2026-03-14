"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createEmailTemplate, updateEmailTemplate } from "@/services/email-templates";

interface TemplateEditorProps {
  template?: {
    id: string;
    name: string;
    subject: string;
    htmlContent: string;
  };
}

export function TemplateEditor({ template }: TemplateEditorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    let result;
    if (template) {
      result = await updateEmailTemplate(template.id, formData);
    } else {
      result = await createEmailTemplate(formData);
    }

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (!template && "templateId" in result) {
      router.push(`/templates/${result.templateId}`);
    } else {
      router.refresh();
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Detalhes do template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={template?.name}
              placeholder="Ex: Email de boas-vindas"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">Assunto *</Label>
            <Input
              id="subject"
              name="subject"
              defaultValue={template?.subject}
              placeholder="Assunto do email"
              required
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conteudo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="htmlContent">HTML do email</Label>
            <Textarea
              id="htmlContent"
              name="htmlContent"
              defaultValue={template?.htmlContent}
              placeholder="<h1>Ola {{firstName}}!</h1><p>Bem-vindo...</p>"
              rows={15}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Variaveis disponiveis: {"{{firstName}}"}, {"{{lastName}}"}, {"{{email}}"}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push("/templates")}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : template ? "Salvar alteracoes" : "Criar template"}
        </Button>
      </div>
    </form>
  );
}
