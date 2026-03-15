"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Variable, Copy, Check, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/ui/confirm-dialog";
import Link from "next/link";
import { updateWhatsAppTemplate, deleteWhatsAppTemplate } from "@/services/whatsapp-templates";

const variables = [
  { key: "{{firstName}}", label: "Primeiro nome" },
  { key: "{{lastName}}", label: "Sobrenome" },
  { key: "{{email}}", label: "Email" },
  { key: "{{phone}}", label: "Telefone" },
];

interface WhatsAppTemplateEditFormProps {
  template: {
    id: string;
    name: string;
    message: string;
  };
}

export function WhatsAppTemplateEditForm({ template }: WhatsAppTemplateEditFormProps) {
  const router = useRouter();
  const { confirm } = useConfirm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(template.message);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  function handleCopyVariable(varKey: string) {
    navigator.clipboard.writeText(varKey);
    setCopiedVar(varKey);
    setTimeout(() => setCopiedVar(null), 1500);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("message", message);

    const result = await updateWhatsAppTemplate(template.id, formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push("/templates/whatsapp");
  }

  async function handleDelete() {
    const ok = await confirm({
      title: "Excluir template",
      description: "Tem certeza que deseja excluir este template de WhatsApp?",
      confirmLabel: "Excluir",
      variant: "destructive",
    });
    if (!ok) return;
    await deleteWhatsAppTemplate(template.id);
    router.push("/templates/whatsapp");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/templates/whatsapp">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Editar template de WhatsApp</h1>
            <p className="text-muted-foreground">Atualize o template de mensagem</p>
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash2 className="h-4 w-4 mr-2" />
          Excluir
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Detalhes do template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do template *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={template.name}
                  placeholder="Ex: Boas-vindas WhatsApp"
                  required
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Variable className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Variaveis disponiveis:</span>
                {variables.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted hover:bg-accent text-xs font-mono transition-colors"
                    onClick={() => handleCopyVariable(v.key)}
                    title={`Copiar ${v.key}`}
                  >
                    {v.key}
                    {copiedVar === v.key ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    )}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Mensagem *</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Digite a mensagem do WhatsApp..."
                  rows={8}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Use *texto* para negrito, _texto_ para italico, ~texto~ para tachado.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-[#e5ddd5] dark:bg-[#0b141a] rounded-lg p-4 min-h-[300px]">
                <div className="flex justify-end">
                  <div className="bg-[#dcf8c6] dark:bg-[#005c4b] rounded-lg rounded-tr-none p-3 max-w-[85%] shadow-sm">
                    <p className="text-sm text-[#111b21] dark:text-[#e9edef] whitespace-pre-wrap break-words">
                      {message || "Sua mensagem aparecera aqui..."}
                    </p>
                    <p className="text-[10px] text-[#667781] dark:text-[#8696a0] text-right mt-1">
                      {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/templates/whatsapp">
            <Button type="button" variant="outline">
              Voltar
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Salvar alteracoes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
