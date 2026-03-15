"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { saveWhatsAppSettings, removeWhatsAppApiKey } from "@/services/settings";
import { MessageCircle, Eye, EyeOff, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";

interface WhatsAppSettingsFormProps {
  initialData: {
    evolutionApiUrl: string;
    evolutionInstance: string;
    hasApiKey: boolean;
    maskedApiKey: string;
  };
}

export function WhatsAppSettingsForm({ initialData }: WhatsAppSettingsFormProps) {
  const { confirm } = useConfirm();
  const [evolutionApiUrl, setEvolutionApiUrl] = useState(initialData.evolutionApiUrl);
  const [evolutionInstance, setEvolutionInstance] = useState(initialData.evolutionInstance);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.set("evolutionApiUrl", evolutionApiUrl);
      formData.set("evolutionInstance", evolutionInstance);
      if (apiKey.trim()) {
        formData.set("apiKey", apiKey);
      }

      const result = await saveWhatsAppSettings(formData);
      if (result.success) {
        setMessage({ type: "success", text: "Configurações do WhatsApp salvas com sucesso!" });
        setApiKey("");
      }
    } catch {
      setMessage({ type: "error", text: "Erro ao salvar configurações" });
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveKey() {
    const ok = await confirm({
      title: "Remover API key",
      description: "Tem certeza que deseja remover a API key? O envio de WhatsApp sera desativado.",
      confirmLabel: "Remover",
      variant: "destructive",
    });
    if (!ok) return;

    setRemoving(true);
    setMessage(null);

    try {
      await removeWhatsAppApiKey();
      setMessage({ type: "success", text: "API key removida com sucesso" });
    } catch {
      setMessage({ type: "error", text: "Erro ao remover API key" });
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-green-600" />
          Integração WhatsApp (Evolution API)
        </CardTitle>
        <CardDescription>
          Configure a Evolution API para envio de mensagens via WhatsApp nas automações. A API key é criptografada antes de ser salva.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="evolutionApiUrl">URL da API</Label>
              <Input
                id="evolutionApiUrl"
                placeholder="https://evolution.exemplo.com"
                value={evolutionApiUrl}
                onChange={(e) => setEvolutionApiUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                URL base da sua instância Evolution API
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="evolutionInstance">Nome da Instância</Label>
              <Input
                id="evolutionInstance"
                placeholder="minha-instancia"
                value={evolutionInstance}
                onChange={(e) => setEvolutionInstance(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Nome da instância configurada na Evolution
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsappApiKey">API Key da Evolution</Label>

            {initialData.hasApiKey && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                <span className="text-sm text-green-700 dark:text-green-300">
                  API key configurada: <code className="font-mono text-xs">{initialData.maskedApiKey}</code>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 h-7 px-2"
                  onClick={handleRemoveKey}
                  disabled={removing}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  {removing ? "Removendo..." : "Remover"}
                </Button>
              </div>
            )}

            <div className="relative">
              <Input
                id="whatsappApiKey"
                type={showApiKey ? "text" : "password"}
                placeholder={initialData.hasApiKey ? "Digite uma nova key para substituir" : "Sua API key da Evolution"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              A chave é criptografada com AES-256-GCM antes de ser armazenada. Deixe em branco para manter a chave atual.
            </p>
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
            {saving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
