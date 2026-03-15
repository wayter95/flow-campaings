"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { updateWorkspace } from "@/services/settings";
import { Building2, CheckCircle2, AlertCircle } from "lucide-react";

interface WorkspaceFormProps {
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
}

export function WorkspaceForm({ workspace }: WorkspaceFormProps) {
  const [name, setName] = useState(workspace.name);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.set("name", name);

      const result = await updateWorkspace(formData);
      if ("error" in result && result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: "Workspace atualizado!" });
      }
    } catch {
      setMessage({ type: "error", text: "Erro ao atualizar workspace" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Workspace
        </CardTitle>
        <CardDescription>
          Configurações do seu workspace
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="workspaceName">Nome do Workspace</Label>
              <Input
                id="workspaceName"
                placeholder="Minha Empresa"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workspaceSlug">Slug</Label>
              <Input
                id="workspaceSlug"
                value={workspace.slug}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                O slug não pode ser alterado
              </p>
            </div>
          </div>

          {message && (
            <div
              className={`flex items-center gap-2 p-3 rounded-md text-sm ${
                message.type === "success"
                  ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              {message.text}
            </div>
          )}

          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar Workspace"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
