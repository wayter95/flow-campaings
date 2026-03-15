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
import { X } from "lucide-react";
import type { Node } from "@xyflow/react";

interface NodeConfigPanelProps {
  node: Node;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onClose: () => void;
  forms: { id: string; name: string }[];
  tags: { id: string; name: string }[];
  templates: { id: string; name: string; subject: string }[];
}

export function NodeConfigPanel({ node, onUpdate, onClose, forms, tags, templates }: NodeConfigPanelProps) {
  const data = node.data as Record<string, unknown>;

  function update(updates: Record<string, unknown>) {
    onUpdate(node.id, { ...data, ...updates });
  }

  return (
    <div className="w-80 border-l bg-card p-4 space-y-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Configuracao</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {node.type === "trigger" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Tipo de trigger</Label>
            <Select
              value={(data.triggerType as string) || ""}
              onValueChange={(v) => v && update({ triggerType: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="form_submitted">Formulario enviado</SelectItem>
                <SelectItem value="tag_added">Tag adicionada</SelectItem>
                <SelectItem value="contact_created">Contato criado</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {data.triggerType === "form_submitted" && (
            <div className="space-y-2">
              <Label className="text-xs">Formulario</Label>
              <Select
                value={(data.formId as string) || ""}
                onValueChange={(v) => v && update({ formId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
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
            <div className="space-y-2">
              <Label className="text-xs">Tag</Label>
              <Select
                value={(data.tagId as string) || ""}
                onValueChange={(v) => v && update({ tagId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {tags.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {node.type === "action" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Tipo de acao</Label>
            <Select
              value={(data.actionType as string) || ""}
              onValueChange={(v) => v && update({ actionType: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="send_email">Enviar email</SelectItem>
                <SelectItem value="send_whatsapp">Enviar WhatsApp</SelectItem>
                <SelectItem value="add_tag">Adicionar tag</SelectItem>
                <SelectItem value="remove_tag">Remover tag</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {data.actionType === "send_email" && (
            <>
              <div className="space-y-2">
                <Label className="text-xs">Template (opcional)</Label>
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
                  <SelectTrigger>
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
                  <div className="space-y-2">
                    <Label className="text-xs">Assunto</Label>
                    <Input
                      value={(data.subject as string) || ""}
                      onChange={(e) => update({ subject: e.target.value })}
                      placeholder="Assunto do email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">HTML</Label>
                    <Textarea
                      value={(data.htmlContent as string) || ""}
                      onChange={(e) => update({ htmlContent: e.target.value })}
                      placeholder="<h1>Ola {{firstName}}!</h1>"
                      rows={8}
                      className="font-mono text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Variaveis: {"{{firstName}}"}, {"{{lastName}}"}, {"{{email}}"}
                    </p>
                  </div>
                </>
              )}
            </>
          )}

          {data.actionType === "send_whatsapp" && (
            <div className="space-y-2">
              <Label className="text-xs">Mensagem do WhatsApp</Label>
              <Textarea
                value={(data.whatsappMessage as string) || ""}
                onChange={(e) => update({ whatsappMessage: e.target.value })}
                placeholder="Ola {{firstName}}! Tudo bem?"
                rows={6}
              />
              <p className="text-[10px] text-muted-foreground">
                Variaveis: {"{{firstName}}"}, {"{{lastName}}"}, {"{{email}}"}
              </p>
              <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <p className="text-[10px] text-amber-700 dark:text-amber-300">
                  O contato precisa ter um numero de telefone cadastrado para receber mensagens via WhatsApp.
                </p>
              </div>
            </div>
          )}

          {(data.actionType === "add_tag" || data.actionType === "remove_tag") && (
            <div className="space-y-2">
              <Label className="text-xs">Tag</Label>
              <Select
                value={(data.tagId as string) || ""}
                onValueChange={(v) => {
                  if (!v) return;
                  const tag = tags.find((t) => t.id === v);
                  update({ tagId: v, tagName: tag?.name });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {tags.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {node.type === "delay" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Duracao</Label>
            <Input
              type="number"
              min={1}
              value={(data.duration as number) || 1}
              onChange={(e) => update({ duration: parseInt(e.target.value) || 1 })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Unidade</Label>
            <Select
              value={(data.unit as string) || "days"}
              onValueChange={(v) => v && update({ unit: v })}
            >
              <SelectTrigger>
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
      )}

      {node.type === "condition" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Campo</Label>
            <Select
              value={(data.field as string) || "tag"}
              onValueChange={(v) => v && update({ field: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tag">Tag</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="unsubscribed">Descadastrado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Operador</Label>
            <Select
              value={(data.op as string) || "contains"}
              onValueChange={(v) => v && update({ op: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contains">Contem</SelectItem>
                <SelectItem value="not_contains">Nao contem</SelectItem>
                <SelectItem value="equals">Igual a</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Valor</Label>
            <Input
              value={(data.value as string) || ""}
              onChange={(e) => update({ value: e.target.value })}
              placeholder="Valor"
            />
          </div>
        </div>
      )}
    </div>
  );
}
