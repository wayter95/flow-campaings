"use client";

import { useState, useCallback, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createCampaign, updateCampaign } from "@/services/campaigns";
import { HtmlCodeEditor } from "@/components/templates/html-code-editor";
import { cn } from "@/lib/utils";
import { X, FileCode, Variable, Copy, Check, Code, Eye, Columns2, Monitor, Smartphone, MousePointerClick, Loader2, FileText, CheckCircle2, Mail, MessageCircle } from "lucide-react";

const DragDropEmailEditor = lazy(() =>
  import("@/components/templates/drag-drop-email-editor").then((m) => ({ default: m.DragDropEmailEditor }))
);

type EditorTab = "visual" | "code";
type CodeViewMode = "code" | "preview" | "split";
type PreviewDevice = "desktop" | "mobile";
type CampaignChannel = "email" | "whatsapp";

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

interface Segment {
  id: string;
  name: string;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  message: string;
}

interface CampaignEditorProps {
  campaign?: {
    id: string;
    name: string;
    subject: string | null;
    htmlContent: string | null;
    channel?: string | null;
    templateId?: string | null;
    scheduledAt?: Date | null;
  };
  segments?: Segment[];
  selectedSegmentIds?: string[];
  templates?: Template[];
  whatsappTemplates?: WhatsAppTemplate[];
}

const emailVariables = [
  { key: "{{firstName}}", label: "Primeiro nome" },
  { key: "{{lastName}}", label: "Sobrenome" },
  { key: "{{email}}", label: "Email" },
  { key: "{{unsubscribeUrl}}", label: "Link de descadastro" },
];

const whatsappVariables = [
  { key: "{{firstName}}", label: "Primeiro nome" },
  { key: "{{lastName}}", label: "Sobrenome" },
  { key: "{{email}}", label: "Email" },
  { key: "{{phone}}", label: "Telefone" },
];

export function CampaignEditor({
  campaign,
  segments = [],
  selectedSegmentIds = [],
  templates = [],
  whatsappTemplates = [],
}: CampaignEditorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [channel, setChannel] = useState<CampaignChannel>((campaign?.channel as CampaignChannel) || "email");
  const [selectedSegments, setSelectedSegments] = useState<string[]>(selectedSegmentIds);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(campaign?.templateId || "none");
  const [subject, setSubject] = useState(campaign?.subject || "");
  const [htmlContent, setHtmlContent] = useState(campaign?.htmlContent || "");
  const [whatsappMessage, setWhatsappMessage] = useState(
    campaign?.channel === "whatsapp" ? (campaign?.htmlContent || "") : ""
  );
  const [selectedWhatsAppTemplateId, setSelectedWhatsAppTemplateId] = useState<string>("none");
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const [editorTab, setEditorTab] = useState<EditorTab>("visual");
  const [codeViewMode, setCodeViewMode] = useState<CodeViewMode>("split");
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const variables = channel === "whatsapp" ? whatsappVariables : emailVariables;

  function toggleSegment(id: string) {
    setSelectedSegments((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  const handleSelectTemplate = useCallback((templateId: string | null) => {
    if (!templateId) return;
    const hasContent = subject.trim() || htmlContent.trim();
    if (hasContent && templateId !== selectedTemplateId &&
        !confirm("Isso vai substituir o assunto e conteudo atuais. Continuar?")) return;

    setSelectedTemplateId(templateId);

    if (templateId !== "none") {
      const tmpl = templates.find((t) => t.id === templateId);
      if (tmpl) {
        setSubject(tmpl.subject);
        setHtmlContent(tmpl.htmlContent);
      }
    } else {
      setSubject("");
      setHtmlContent("");
    }
  }, [templates, subject, htmlContent, selectedTemplateId]);

  const handleSelectWhatsAppTemplate = useCallback((templateId: string) => {
    if (whatsappMessage.trim() && templateId !== selectedWhatsAppTemplateId &&
        !confirm("Isso vai substituir a mensagem atual. Continuar?")) return;

    setSelectedWhatsAppTemplateId(templateId);

    if (templateId !== "none") {
      const tmpl = whatsappTemplates.find((t) => t.id === templateId);
      if (tmpl) {
        setWhatsappMessage(tmpl.message);
      }
    } else {
      setWhatsappMessage("");
    }
  }, [whatsappTemplates, whatsappMessage, selectedWhatsAppTemplateId]);

  const handleCopyVariable = useCallback((varKey: string) => {
    navigator.clipboard.writeText(varKey);
    setCopiedVar(varKey);
    setTimeout(() => setCopiedVar(null), 1500);
  }, []);

  const handleUseStarter = useCallback(() => {
    if ((subject.trim() || htmlContent.trim()) &&
        !confirm("Isso vai substituir o conteudo atual. Continuar?")) return;
    setHtmlContent(starterTemplate);
  }, [htmlContent, subject]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("channel", channel);

    if (channel === "whatsapp") {
      formData.set("htmlContent", whatsappMessage);
      formData.delete("subject");
    } else {
      formData.set("subject", subject);
      formData.set("htmlContent", htmlContent);
    }

    if (channel === "email" && selectedTemplateId !== "none") {
      formData.set("templateId", selectedTemplateId);
    }

    if (selectedSegments.length > 0) {
      formData.set("segmentIds", JSON.stringify(selectedSegments));
    }

    let result;
    if (campaign) {
      result = await updateCampaign(campaign.id, formData);
    } else {
      result = await createCampaign(formData);
    }

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (!campaign && "campaignId" in result) {
      router.push(`/campaigns/${result.campaignId}`);
    } else {
      router.refresh();
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
          {error}
        </div>
      )}

      {/* Channel selector */}
      <Card>
        <CardHeader>
          <CardTitle>Canal de envio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                type="button"
                variant={channel === "email" ? "default" : "ghost"}
                size="sm"
                className="h-8 text-sm gap-2"
                onClick={() => setChannel("email")}
              >
                <Mail className="h-4 w-4" />
                Email
              </Button>
              <Button
                type="button"
                variant={channel === "whatsapp" ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-8 text-sm gap-2",
                  channel === "whatsapp" && "bg-emerald-600 text-white hover:bg-emerald-700"
                )}
                onClick={() => setChannel("whatsapp")}
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes da campanha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da campanha *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={campaign?.name}
              placeholder="Ex: Newsletter de marco"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scheduledAt">Agendar envio (opcional)</Label>
            <Input
              id="scheduledAt"
              name="scheduledAt"
              type="datetime-local"
              defaultValue={
                campaign?.scheduledAt
                  ? new Date(campaign.scheduledAt).toISOString().slice(0, 16)
                  : ""
              }
            />
            <p className="text-xs text-muted-foreground">
              Deixe vazio para enviar manualmente.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Segments */}
      {!campaign && segments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Audiencia</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Selecione segmentos para enviar. Sem selecao, envia para todos os contatos.
            </p>
            <div className="flex flex-wrap gap-2">
              {segments.map((segment) => {
                const isSelected = selectedSegments.includes(segment.id);
                return (
                  <Badge
                    key={segment.id}
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleSegment(segment.id)}
                  >
                    {segment.name}
                    {isSelected && <X className="h-3 w-3 ml-1" />}
                  </Badge>
                );
              })}
            </div>
            {selectedSegments.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {selectedSegments.length} segmento{selectedSegments.length > 1 ? "s" : ""} selecionado{selectedSegments.length > 1 ? "s" : ""}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* WhatsApp content */}
      {channel === "whatsapp" && (
        <Card>
          <CardHeader>
            <CardTitle>Mensagem do WhatsApp</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* WhatsApp template selector */}
            {whatsappTemplates.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Template de WhatsApp</Label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectWhatsAppTemplate("none")}
                    className={cn(
                      "px-3 py-1.5 rounded-md border-2 text-sm transition-all",
                      selectedWhatsAppTemplateId === "none"
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    Do zero
                  </button>
                  {whatsappTemplates.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => handleSelectWhatsAppTemplate(tmpl.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-md border-2 text-sm transition-all",
                        selectedWhatsAppTemplateId === tmpl.id
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      {tmpl.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Variables bar */}
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

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="whatsapp-message">Mensagem *</Label>
                <Textarea
                  id="whatsapp-message"
                  value={whatsappMessage}
                  onChange={(e) => setWhatsappMessage(e.target.value)}
                  placeholder="Digite a mensagem do WhatsApp..."
                  rows={12}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Use *texto* para negrito, _texto_ para italico, ~texto~ para tachado.
                </p>
              </div>

              {/* WhatsApp preview bubble */}
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="bg-[#e5ddd5] dark:bg-[#0b141a] rounded-lg p-4 min-h-[300px]">
                  <div className="flex justify-end">
                    <div className="bg-[#dcf8c6] dark:bg-[#005c4b] rounded-lg rounded-tr-none p-3 max-w-[85%] shadow-sm">
                      <p className="text-sm text-[#111b21] dark:text-[#e9edef] whitespace-pre-wrap break-words">
                        {whatsappMessage || "Sua mensagem aparecera aqui..."}
                      </p>
                      <p className="text-[10px] text-[#667781] dark:text-[#8696a0] text-right mt-1">
                        {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email content */}
      {channel === "email" && (
      <Card>
        <CardHeader>
          <CardTitle>Conteudo do email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="campaign-subject">Assunto do email</Label>
            <Input
              id="campaign-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={selectedTemplate ? `Template: ${selectedTemplate.subject}` : "Assunto que aparece na caixa de entrada"}
            />
            {selectedTemplate && !subject.trim() && (
              <p className="text-xs text-muted-foreground">
                Sera usado o assunto do template: &quot;{selectedTemplate.subject}&quot;
              </p>
            )}
          </div>

          {/* Template cards - escolher base (apenas se houver templates) */}
          {templates.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileCode className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Base do email</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Clique em um template para usa-lo como base. Voce pode editar o conteudo abaixo.
            </p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2 max-w-2xl">
              {/* Card: Começar do zero */}
              <button
                type="button"
                onClick={() => handleSelectTemplate("none")}
                className={cn(
                  "relative flex flex-col rounded-md border-2 bg-card overflow-hidden transition-all hover:border-primary/50 hover:shadow-sm text-left w-full",
                  selectedTemplateId === "none"
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border"
                )}
              >
                <div className="aspect-4/3 bg-muted flex items-center justify-center p-2 min-h-[60px]">
                  <FileText className="h-6 w-6 text-muted-foreground shrink-0" />
                </div>
                <div className="p-1.5">
                  <p className="font-medium text-xs truncate">Do zero</p>
                </div>
                {selectedTemplateId === "none" && (
                  <div className="absolute top-1 right-1 rounded-full bg-primary p-0.5">
                    <CheckCircle2 className="h-2.5 w-2.5 text-primary-foreground" />
                  </div>
                )}
              </button>

              {/* Cards dos templates */}
              {templates.map((tmpl) => {
                const isSelected = selectedTemplateId === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tmpl.id)}
                    className={cn(
                      "relative flex flex-col rounded-md border-2 bg-card overflow-hidden transition-all hover:border-primary/50 hover:shadow-sm text-left w-full",
                      isSelected ? "border-primary ring-2 ring-primary/20" : "border-border"
                    )}
                  >
                    <div className="aspect-4/3 bg-white border-b overflow-hidden relative min-h-[60px]">
                      <iframe
                        srcDoc={tmpl.htmlContent || "<p style='padding:8px;font-size:10px;color:#999;'>Sem preview</p>"}
                        title={`Preview: ${tmpl.name}`}
                        className="absolute inset-0 w-[400%] h-[400%] scale-[0.25] origin-top-left pointer-events-none"
                        sandbox="allow-same-origin"
                      />
                    </div>
                    <div className="p-1.5">
                      <p className="font-medium text-xs truncate" title={tmpl.name}>{tmpl.name}</p>
                    </div>
                    {isSelected && (
                      <div className="absolute top-1 right-1 rounded-full bg-primary p-0.5">
                        <CheckCircle2 className="h-2.5 w-2.5 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {selectedTemplate && (
              <p className="text-xs text-muted-foreground">
                Template vinculado: <strong>{selectedTemplate.name}</strong>.
                Se os campos estiverem vazios no envio, o conteudo do template sera usado automaticamente.
              </p>
            )}
          </div>
          )}

          {/* Variables bar */}
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

          {/* Editor mode tabs */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                type="button"
                variant={editorTab === "visual" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => setEditorTab("visual")}
              >
                <MousePointerClick className="h-3.5 w-3.5" />
                Visual (arrastar e soltar)
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

          {selectedTemplate && !htmlContent.trim() && (
            <p className="text-xs text-muted-foreground">
              Sera usado o HTML do template vinculado. Edite abaixo para customizar.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            As variaveis {"{{firstName}}"}, {"{{lastName}}"} e {"{{email}}"} serao substituidas automaticamente por contato no envio.
          </p>

          {/* Visual Editor (GrapesJS - arrastar e soltar) */}
          {editorTab === "visual" && (
            <div
              className="border rounded-lg overflow-hidden"
              style={{ height: "calc(100vh - 480px)", minHeight: "450px" }}
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

          {/* Code Editor */}
          {editorTab === "code" && (
            <div
              className={`border rounded-lg overflow-hidden ${
                codeViewMode === "split" ? "grid grid-cols-2" : ""
              }`}
              style={{ height: "calc(100vh - 480px)", minHeight: "400px" }}
            >
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
                        srcDoc={htmlContent || "<p style='color:#999;padding:24px;font-family:sans-serif;'>Preview aparecera aqui...</p>"}
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
        </CardContent>
      </Card>
      )}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/campaigns")}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading
            ? "Salvando..."
            : campaign
            ? "Salvar alteracoes"
            : "Criar campanha"}
        </Button>
      </div>
    </form>
  );
}
