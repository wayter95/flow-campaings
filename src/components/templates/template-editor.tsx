"use client";

import { useState, useRef, useCallback, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createEmailTemplate, updateEmailTemplate } from "@/services/email-templates";
import { HtmlCodeEditor } from "./html-code-editor";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  Code,
  Eye,
  Columns2,
  Monitor,
  Smartphone,
  Variable,
  Copy,
  Check,
  MousePointerClick,
  Loader2,
} from "lucide-react";

const DragDropEmailEditor = lazy(() =>
  import("./drag-drop-email-editor").then((m) => ({ default: m.DragDropEmailEditor }))
);

interface TemplateEditorProps {
  template?: {
    id: string;
    name: string;
    subject: string;
    htmlContent: string;
  };
}

type EditorTab = "visual" | "code";
type CodeViewMode = "code" | "preview" | "split";
type PreviewDevice = "desktop" | "mobile";

const variables = [
  { key: "{{firstName}}", label: "Primeiro nome" },
  { key: "{{lastName}}", label: "Sobrenome" },
  { key: "{{email}}", label: "Email" },
];

const starterTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background-color: #4F46E5; color: white; padding: 24px; text-align: center; }
    .content { padding: 24px; color: #333333; line-height: 1.6; }
    .button { display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0; }
    .footer { padding: 16px 24px; text-align: center; color: #999999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Titulo do email</h1>
    </div>
    <div class="content">
      <p>Ola {{firstName}},</p>
      <p>Seu conteudo aqui...</p>
      <a href="#" class="button">Call to Action</a>
    </div>
    <div class="footer">
      <p>&copy; 2026 Sua Empresa. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>`;

export function TemplateEditor({ template }: TemplateEditorProps) {
  const router = useRouter();
  const { confirm } = useConfirm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [htmlContent, setHtmlContent] = useState(template?.htmlContent || "");
  const [editorTab, setEditorTab] = useState<EditorTab>("visual");
  const [codeViewMode, setCodeViewMode] = useState<CodeViewMode>("split");
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);

  const handleCopyVariable = useCallback((varKey: string) => {
    navigator.clipboard.writeText(varKey);
    setCopiedVar(varKey);
    setTimeout(() => setCopiedVar(null), 1500);
  }, []);

  const handleUseStarter = useCallback(async () => {
    if (htmlContent.trim()) {
      const ok = await confirm({
        title: "Substituir conteudo",
        description: "Isso vai substituir o conteudo atual. Continuar?",
        confirmLabel: "Substituir",
      });
      if (!ok) return;
    }
    setHtmlContent(starterTemplate);
  }, [htmlContent, confirm]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData();
    formData.set("name", nameRef.current?.value || "");
    formData.set("subject", subjectRef.current?.value || "");
    formData.set("htmlContent", htmlContent);

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

  const previewHtml = htmlContent || "<p style='color:#999;padding:24px;font-family:sans-serif;'>Preview aparecera aqui...</p>";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{error}</div>
      )}

      {/* Details card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Detalhes do template</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                ref={nameRef}
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
                ref={subjectRef}
                id="subject"
                name="subject"
                defaultValue={template?.subject}
                placeholder="Assunto do email"
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main editor tabs + toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* Editor mode tabs */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            type="button"
            variant={editorTab === "visual" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setEditorTab("visual")}
          >
            <MousePointerClick className="h-3.5 w-3.5" />
            Visual
          </Button>
          <Button
            type="button"
            variant={editorTab === "code" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setEditorTab("code")}
          >
            <Code className="h-3.5 w-3.5" />
            Codigo
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Code view sub-modes */}
          {editorTab === "code" && (
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                type="button"
                variant={codeViewMode === "code" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setCodeViewMode("code")}
              >
                Codigo
              </Button>
              <Button
                type="button"
                variant={codeViewMode === "split" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setCodeViewMode("split")}
              >
                <Columns2 className="h-3.5 w-3.5 mr-1" />
                Dividido
              </Button>
              <Button
                type="button"
                variant={codeViewMode === "preview" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setCodeViewMode("preview")}
              >
                <Eye className="h-3.5 w-3.5 mr-1" />
                Preview
              </Button>
            </div>
          )}

          {/* Preview device toggle */}
          {(editorTab === "visual" || (editorTab === "code" && codeViewMode !== "code")) && (
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                type="button"
                variant={previewDevice === "desktop" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => setPreviewDevice("desktop")}
              >
                <Monitor className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant={previewDevice === "mobile" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => setPreviewDevice("mobile")}
              >
                <Smartphone className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {editorTab === "code" && !htmlContent.trim() && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleUseStarter}
            >
              Usar template inicial
            </Button>
          )}
        </div>
      </div>

      {/* Variables bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Variable className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Variaveis:</span>
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

      {/* ─── VISUAL EDITOR (GrapesJS) ─── */}
      {editorTab === "visual" && (
        <div
          className="border rounded-lg overflow-hidden"
          style={{ height: "calc(100vh - 380px)", minHeight: "500px" }}
        >
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Carregando editor visual...</span>
              </div>
            }
          >
            <DragDropEmailEditor
              value={htmlContent}
              onChange={setHtmlContent}
            />
          </Suspense>
        </div>
      )}

      {/* ─── CODE EDITOR ─── */}
      {editorTab === "code" && (
        <div
          className={`border rounded-lg overflow-hidden ${
            codeViewMode === "split" ? "grid grid-cols-2" : ""
          }`}
          style={{ height: "calc(100vh - 380px)", minHeight: "400px" }}
        >
          {/* Code editor panel */}
          {codeViewMode !== "preview" && (
            <div className={`flex flex-col ${codeViewMode === "split" ? "border-r" : ""}`}>
              <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/50">
                <span className="text-xs font-medium text-muted-foreground">HTML</span>
                {htmlContent.trim() && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={handleUseStarter}
                  >
                    Template inicial
                  </Button>
                )}
              </div>
              <div className="flex-1 overflow-hidden">
                <HtmlCodeEditor
                  value={htmlContent}
                  onChange={setHtmlContent}
                  className="h-full border-0 rounded-none"
                />
              </div>
            </div>
          )}

          {/* Preview panel */}
          {codeViewMode !== "code" && (
            <div className="flex flex-col bg-muted/30">
              <div className="px-3 py-1.5 border-b bg-muted/50">
                <span className="text-xs font-medium text-muted-foreground">
                  Preview {previewDevice === "mobile" ? "(Mobile 375px)" : "(Desktop)"}
                </span>
              </div>
              <div className="flex-1 overflow-auto flex justify-center p-4">
                <div
                  className={`bg-white rounded shadow-sm h-fit ${
                    previewDevice === "mobile" ? "w-[375px]" : "w-full max-w-[700px]"
                  }`}
                >
                  <iframe
                    srcDoc={previewHtml}
                    title="Email preview"
                    className="w-full border-0 rounded"
                    style={{
                      height: previewDevice === "mobile" ? "667px" : "600px",
                      minHeight: "300px",
                    }}
                    sandbox="allow-same-origin"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
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
