"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Zap, Mail, Clock, GitBranch, Info } from "lucide-react";
import type { Node } from "@xyflow/react";

interface NodeConfigPanelProps {
  node: Node;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onClose: () => void;
  forms: { id: string; name: string }[];
  tags: { id: string; name: string }[];
  templates: { id: string; name: string; subject: string }[];
  whatsappTemplates: { id: string; name: string; message: string }[];
}

const sectionClass = "rounded-lg border border-border/60 bg-muted/20 p-3 space-y-3";
const sectionTitleClass = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";
const fieldClass = "space-y-1.5";
const labelClass = "text-sm font-medium text-foreground";

function ConfigSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={sectionClass}>
      <p className={sectionTitleClass}>{title}</p>
      {children}
    </div>
  );
}

function InfoBox({ children, variant = "muted" }: { children: React.ReactNode; variant?: "muted" | "amber" | "green" }) {
  const styles = {
    muted: "border-border/60 bg-muted/30 text-muted-foreground",
    amber: "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200",
    green: "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200",
  };
  return (
    <div className={`flex gap-2 rounded-md border-l-4 p-2.5 text-xs ${styles[variant]}`}>
      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

export function NodeConfigPanel({ node, onUpdate, onClose, forms, tags, templates, whatsappTemplates }: NodeConfigPanelProps) {
  const data = node.data as Record<string, unknown>;

  function update(updates: Record<string, unknown>) {
    onUpdate(node.id, { ...data, ...updates });
  }

  const nodeTypeLabel = node.type === "trigger" ? "Trigger" : node.type === "action" ? "Ação" : node.type === "delay" ? "Delay" : "Condição";
  const NodeIcon = node.type === "trigger" ? Zap : node.type === "action" ? Mail : node.type === "delay" ? Clock : GitBranch;

  return (
    <div className="w-80 border-l bg-card flex flex-col overflow-hidden">
      <div className="shrink-0 border-b bg-muted/20 px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <NodeIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate">Configuração</h3>
            <p className="text-xs text-muted-foreground truncate">{nodeTypeLabel}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose} aria-label="Fechar">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {node.type === "trigger" && (
        <>
          <ConfigSection title="Quando iniciar">
            <div className={fieldClass}>
              <Label className={labelClass}>Tipo de trigger</Label>
              <Select
                value={(data.triggerType as string) || ""}
                onValueChange={(v) => v && update({ triggerType: v })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione o trigger" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="form_submitted">Formulário enviado</SelectItem>
                  <SelectItem value="tag_added">Tag adicionada</SelectItem>
                  <SelectItem value="contact_created">Contato criado</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {data.triggerType === "form_submitted" && (
              <div className={fieldClass}>
                <Label className={labelClass}>Formulário</Label>
                <Select
                  value={(data.formId as string) || ""}
                  onValueChange={(v) => v && update({ formId: v })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione o formulário" />
                  </SelectTrigger>
                  <SelectContent>
                    {forms.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {data.triggerType === "tag_added" && (
              <div className={fieldClass}>
                <Label className={labelClass}>Tag</Label>
                <Select
                  value={(data.tagId as string) || ""}
                  onValueChange={(v) => v && update({ tagId: v })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione a tag" />
                  </SelectTrigger>
                  <SelectContent>
                    {tags.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </ConfigSection>
        </>
      )}

      {node.type === "action" && (
        <>
          <ConfigSection title="Tipo de ação">
            <div className={fieldClass}>
              <Label className={labelClass}>Ação</Label>
              <Select
                value={(data.actionType as string) || ""}
                onValueChange={(v) => v && update({ actionType: v })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione a ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="send_email">Enviar email</SelectItem>
                  <SelectItem value="send_whatsapp">Enviar WhatsApp</SelectItem>
                  <SelectItem value="add_tag">Adicionar tag</SelectItem>
                  <SelectItem value="remove_tag">Remover tag</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </ConfigSection>

          {data.actionType === "send_email" && (
            <ConfigSection title="Conteúdo do email">
              <div className={fieldClass}>
                <Label className={labelClass}>Template (opcional)</Label>
                <Select
                  value={(data.templateId as string) || "none"}
                  onValueChange={(v) => {
                    if (v && v !== "none") {
                      const tmpl = templates.find((t) => t.id === v);
                      update({ templateId: v, subject: tmpl?.subject || "" });
                    } else {
                      update({ templateId: undefined });
                    }
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Sem template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem template</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!data.templateId && (
                <>
                  <div className={fieldClass}>
                    <Label className={labelClass}>Assunto</Label>
                    <Input
                      className="h-9"
                      value={(data.subject as string) || ""}
                      onChange={(e) => update({ subject: e.target.value })}
                      placeholder="Assunto do email"
                    />
                  </div>
                  <div className={fieldClass}>
                    <Label className={labelClass}>Corpo (HTML)</Label>
                    <Textarea
                      value={(data.htmlContent as string) || ""}
                      onChange={(e) => update({ htmlContent: e.target.value })}
                      placeholder="<h1>Olá {{firstName}}!</h1>"
                      rows={6}
                      className="font-mono text-xs resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Variáveis: {"{{firstName}}"}, {"{{lastName}}"}, {"{{email}}"}
                    </p>
                  </div>
                </>
              )}
            </ConfigSection>
          )}

          {data.actionType === "send_whatsapp" && (
            <>
              <ConfigSection title="Mensagem WhatsApp">
                <div className={fieldClass}>
                  <Label className={labelClass}>Template (opcional)</Label>
                  <Select
                    value={(data.whatsappTemplateId as string) || "none"}
                    onValueChange={(v) => {
                      if (v && v !== "none") {
                        const tmpl = whatsappTemplates.find((t) => t.id === v);
                        update({
                          whatsappTemplateId: v,
                          whatsappMessage: tmpl?.message || "",
                        });
                      } else {
                        update({ whatsappTemplateId: undefined, whatsappMessage: "" });
                      }
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Sem template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem template</SelectItem>
                      {whatsappTemplates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!data.whatsappTemplateId && (
                  <div className={fieldClass}>
                    <Label className={labelClass}>Mensagem</Label>
                    <Textarea
                      value={(data.whatsappMessage as string) || ""}
                      onChange={(e) => update({ whatsappMessage: e.target.value })}
                      placeholder="Olá {{firstName}}! Tudo bem?"
                      rows={4}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Variáveis: {"{{firstName}}"}, {"{{lastName}}"}, {"{{email}}"}
                    </p>
                  </div>
                )}
                {!!data.whatsappTemplateId && (
                  <InfoBox variant="green">A mensagem do template será usada automaticamente.</InfoBox>
                )}
                <InfoBox variant="amber">O contato precisa ter telefone cadastrado para receber WhatsApp.</InfoBox>
              </ConfigSection>
            </>
          )}

          {(data.actionType === "add_tag" || data.actionType === "remove_tag") && (
            <ConfigSection title={data.actionType === "add_tag" ? "Tag a adicionar" : "Tag a remover"}>
              <div className={fieldClass}>
                <Label className={labelClass}>Tag</Label>
                <Select
                  value={(data.tagId as string) || ""}
                  onValueChange={(v) => {
                    if (!v) return;
                    const tag = tags.find((t) => t.id === v);
                    update({ tagId: v, tagName: tag?.name });
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione a tag" />
                  </SelectTrigger>
                  <SelectContent>
                    {tags.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </ConfigSection>
          )}
        </>
      )}

      {node.type === "delay" && (
        <ConfigSection title="Tempo de espera">
          <div className="grid grid-cols-2 gap-3">
            <div className={fieldClass}>
              <Label className={labelClass}>Quantidade</Label>
              <Input
                type="number"
                min={1}
                className="h-9"
                value={(data.duration as number) || 1}
                onChange={(e) => update({ duration: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className={fieldClass}>
              <Label className={labelClass}>Unidade</Label>
              <Select
                value={(data.unit as string) || "days"}
                onValueChange={(v) => v && update({ unit: v })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minutos</SelectItem>
                  <SelectItem value="hours">Horas</SelectItem>
                  <SelectItem value="days">Dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <InfoBox variant="muted">O fluxo pausa por este período antes de seguir para o próximo passo.</InfoBox>
        </ConfigSection>
      )}

      {node.type === "condition" && (
        <ConfigSection title="Regra da condição">
          <div className={fieldClass}>
            <Label className={labelClass}>Campo</Label>
            <Select
              value={(data.field as string) || "tag"}
              onValueChange={(v) => v && update({ field: v })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tag">Tag</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="unsubscribed">Descadastrado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className={fieldClass}>
            <Label className={labelClass}>Operador</Label>
            <Select
              value={(data.op as string) || "contains"}
              onValueChange={(v) => v && update({ op: v })}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contains">Contém</SelectItem>
                <SelectItem value="not_contains">Não contém</SelectItem>
                <SelectItem value="equals">Igual a</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className={fieldClass}>
            <Label className={labelClass}>Valor</Label>
            <Input
              className="h-9"
              value={(data.value as string) || ""}
              onChange={(e) => update({ value: e.target.value })}
              placeholder="Ex.: nome da tag ou email"
            />
          </div>
          <InfoBox variant="muted">O fluxo segue por &quot;Sim&quot; ou &quot;Não&quot; conforme o resultado.</InfoBox>
        </ConfigSection>
      )}
      </div>
    </div>
  );
}
