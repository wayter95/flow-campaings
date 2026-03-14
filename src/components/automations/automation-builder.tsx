"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ArrowDown, GripVertical } from "lucide-react";
import { createAutomation, updateAutomation } from "@/services/automations";

interface TriggerConfig {
  type: "form_submitted" | "tag_added" | "contact_created" | "manual";
  formId?: string;
  tagId?: string;
}

interface StepConfig {
  type: "send_email" | "delay" | "add_tag" | "remove_tag" | "condition";
  config: Record<string, unknown>;
}

interface AutomationBuilderProps {
  automation?: {
    id: string;
    name: string;
    trigger: TriggerConfig;
    steps: { type: string; config: Record<string, unknown>; order: number }[];
  };
  forms: { id: string; name: string }[];
  tags: { id: string; name: string }[];
  templates: { id: string; name: string; subject: string }[];
}

const triggerLabels: Record<string, string> = {
  form_submitted: "Formulario enviado",
  tag_added: "Tag adicionada",
  contact_created: "Contato criado",
  manual: "Manual",
};

const stepLabels: Record<string, string> = {
  send_email: "Enviar email",
  delay: "Aguardar",
  add_tag: "Adicionar tag",
  remove_tag: "Remover tag",
  condition: "Condicao",
};

export function AutomationBuilder({ automation, forms, tags, templates }: AutomationBuilderProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState(automation?.name || "");

  const [trigger, setTrigger] = useState<TriggerConfig>(
    automation?.trigger || { type: "form_submitted" }
  );

  const [steps, setSteps] = useState<StepConfig[]>(
    automation?.steps.map((s) => ({ type: s.type as StepConfig["type"], config: s.config })) || []
  );

  function addStep(type: StepConfig["type"]) {
    const defaultConfigs: Record<string, Record<string, unknown>> = {
      send_email: { subject: "", htmlContent: "" },
      delay: { duration: 1, unit: "days" },
      add_tag: { tagId: "" },
      remove_tag: { tagId: "" },
      condition: { field: "tag", op: "contains", value: "", trueStep: 0, falseStep: 0 },
    };

    setSteps([...steps, { type, config: defaultConfigs[type] }]);
  }

  function removeStep(index: number) {
    setSteps(steps.filter((_, i) => i !== index));
  }

  function updateStep(index: number, config: Record<string, unknown>) {
    setSteps(steps.map((s, i) => (i === index ? { ...s, config: { ...s.config, ...config } } : s)));
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Nome e obrigatorio");
      return;
    }
    if (steps.length === 0) {
      setError("Adicione pelo menos um passo");
      return;
    }

    setError("");
    setLoading(true);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("trigger", JSON.stringify(trigger));
    formData.set(
      "steps",
      JSON.stringify(steps.map((s, i) => ({ type: s.type, config: s.config, order: i })))
    );

    let result;
    if (automation) {
      result = await updateAutomation(automation.id, formData);
    } else {
      result = await createAutomation(formData);
    }

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (!automation && "automationId" in result) {
      router.push(`/automations/${result.automationId}`);
    } else {
      router.refresh();
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Detalhes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="name">Nome da automacao *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Welcome series"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trigger</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Quando iniciar?</Label>
            <Select
              value={trigger.type}
              onValueChange={(v) => v && setTrigger({ type: v as TriggerConfig["type"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(triggerLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {trigger.type === "form_submitted" && (
            <div className="space-y-2">
              <Label>Formulario</Label>
              <Select
                value={trigger.formId || ""}
                onValueChange={(v) => v && setTrigger({ ...trigger, formId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um formulario" />
                </SelectTrigger>
                <SelectContent>
                  {forms.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {trigger.type === "tag_added" && (
            <div className="space-y-2">
              <Label>Tag</Label>
              <Select
                value={trigger.tagId || ""}
                onValueChange={(v) => v && setTrigger({ ...trigger, tagId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma tag" />
                </SelectTrigger>
                <SelectContent>
                  {tags.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Passos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Adicione passos para definir o fluxo da automacao.
            </p>
          )}

          {steps.map((step, index) => (
            <div key={index}>
              {index > 0 && (
                <div className="flex justify-center py-2">
                  <ArrowDown className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {index + 1}. {stepLabels[step.type]}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeStep(index)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {step.type === "send_email" && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Template (opcional)</Label>
                      <Select
                        value={(step.config.templateId as string) || "none"}
                        onValueChange={(v) => {
                          if (v && v !== "none") {
                            const tmpl = templates.find((t) => t.id === v);
                            if (tmpl) {
                              updateStep(index, { templateId: v, subject: tmpl.subject });
                            }
                          } else {
                            updateStep(index, { templateId: undefined });
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sem template" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem template</SelectItem>
                          {templates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {!step.config.templateId && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-xs">Assunto *</Label>
                          <Input
                            value={(step.config.subject as string) || ""}
                            onChange={(e) => updateStep(index, { subject: e.target.value })}
                            placeholder="Assunto do email"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Conteudo HTML</Label>
                          <Textarea
                            value={(step.config.htmlContent as string) || ""}
                            onChange={(e) => updateStep(index, { htmlContent: e.target.value })}
                            placeholder="<h1>Ola {{firstName}}!</h1>"
                            rows={6}
                            className="font-mono text-sm"
                          />
                          <p className="text-xs text-muted-foreground">
                            Variaveis: {"{{firstName}}"}, {"{{lastName}}"}, {"{{email}}"}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {step.type === "delay" && (
                  <div className="flex gap-3">
                    <div className="space-y-2 flex-1">
                      <Label className="text-xs">Duracao</Label>
                      <Input
                        type="number"
                        min={1}
                        value={(step.config.duration as number) || 1}
                        onChange={(e) => updateStep(index, { duration: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div className="space-y-2 flex-1">
                      <Label className="text-xs">Unidade</Label>
                      <Select
                        value={(step.config.unit as string) || "days"}
                        onValueChange={(v) => v && updateStep(index, { unit: v })}
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

                {(step.type === "add_tag" || step.type === "remove_tag") && (
                  <div className="space-y-2">
                    <Label className="text-xs">Tag</Label>
                    <Select
                      value={(step.config.tagId as string) || ""}
                      onValueChange={(v) => v && updateStep(index, { tagId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma tag" />
                      </SelectTrigger>
                      <SelectContent>
                        {tags.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {step.type === "condition" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Campo</Label>
                        <Select
                          value={(step.config.field as string) || "tag"}
                          onValueChange={(v) => v && updateStep(index, { field: v })}
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
                      <div className="space-y-1">
                        <Label className="text-xs">Operador</Label>
                        <Select
                          value={(step.config.op as string) || "contains"}
                          onValueChange={(v) => v && updateStep(index, { op: v })}
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
                      <div className="space-y-1">
                        <Label className="text-xs">Valor</Label>
                        <Input
                          value={(step.config.value as string) || ""}
                          onChange={(e) => updateStep(index, { value: e.target.value })}
                          placeholder="Valor"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Se verdadeiro, ir para passo</Label>
                        <Input
                          type="number"
                          min={0}
                          value={(step.config.trueStep as number) ?? 0}
                          onChange={(e) => updateStep(index, { trueStep: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Se falso, ir para passo</Label>
                        <Input
                          type="number"
                          min={0}
                          value={(step.config.falseStep as number) ?? 0}
                          onChange={(e) => updateStep(index, { falseStep: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => addStep("send_email")}>
              <Plus className="h-3 w-3 mr-1" /> Email
            </Button>
            <Button variant="outline" size="sm" onClick={() => addStep("delay")}>
              <Plus className="h-3 w-3 mr-1" /> Delay
            </Button>
            <Button variant="outline" size="sm" onClick={() => addStep("add_tag")}>
              <Plus className="h-3 w-3 mr-1" /> Adicionar tag
            </Button>
            <Button variant="outline" size="sm" onClick={() => addStep("remove_tag")}>
              <Plus className="h-3 w-3 mr-1" /> Remover tag
            </Button>
            <Button variant="outline" size="sm" onClick={() => addStep("condition")}>
              <Plus className="h-3 w-3 mr-1" /> Condicao
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push("/automations")}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? "Salvando..." : automation ? "Salvar alteracoes" : "Criar automacao"}
        </Button>
      </div>
    </div>
  );
}
