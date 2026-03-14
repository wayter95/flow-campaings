"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { createSegment, previewSegmentCount } from "@/services/segments";
import type { ConditionField, ConditionOperator, SegmentCondition } from "@/services/segments";

const fieldOptions: { value: ConditionField; label: string }[] = [
  { value: "tag", label: "Tag" },
  { value: "email", label: "Email" },
  { value: "firstName", label: "Nome" },
  { value: "lastName", label: "Sobrenome" },
  { value: "source", label: "Origem" },
  { value: "createdAt", label: "Data de criacao" },
  { value: "unsubscribed", label: "Descadastrado" },
];

const operatorsByField: Record<string, { value: ConditionOperator; label: string }[]> = {
  tag: [
    { value: "contains", label: "Contem" },
    { value: "not_contains", label: "Nao contem" },
  ],
  email: [
    { value: "contains", label: "Contem" },
    { value: "not_contains", label: "Nao contem" },
    { value: "equals", label: "Igual a" },
  ],
  firstName: [
    { value: "contains", label: "Contem" },
    { value: "equals", label: "Igual a" },
  ],
  lastName: [
    { value: "contains", label: "Contem" },
    { value: "equals", label: "Igual a" },
  ],
  source: [
    { value: "equals", label: "Igual a" },
    { value: "not_equals", label: "Diferente de" },
  ],
  createdAt: [
    { value: "after", label: "Depois de" },
    { value: "before", label: "Antes de" },
  ],
  unsubscribed: [
    { value: "equals", label: "Igual a" },
  ],
};

export function SegmentBuilder() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [operator, setOperator] = useState<"AND" | "OR">("AND");
  const [conditions, setConditions] = useState<SegmentCondition[]>([
    { field: "tag", op: "contains", value: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  function addCondition() {
    setConditions([...conditions, { field: "tag", op: "contains", value: "" }]);
  }

  function removeCondition(index: number) {
    if (conditions.length === 1) return;
    setConditions(conditions.filter((_, i) => i !== index));
  }

  function updateCondition(index: number, updates: Partial<SegmentCondition>) {
    setConditions(
      conditions.map((c, i) => {
        if (i !== index) return c;
        const updated = { ...c, ...updates };
        if (updates.field && updates.field !== c.field) {
          const ops = operatorsByField[updates.field];
          updated.op = ops?.[0]?.value || "equals";
          updated.value = "";
        }
        return updated;
      })
    );
  }

  async function handlePreview() {
    const rules = JSON.stringify({ operator, conditions });
    const count = await previewSegmentCount(rules);
    setPreviewCount(count);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Nome e obrigatorio");
      return;
    }

    if (conditions.some((c) => !c.value.trim())) {
      setError("Todas as condicoes devem ter um valor");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.set("name", name);
    formData.set("rules", JSON.stringify({ operator, conditions }));

    const result = await createSegment(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(`/segments/${result.segmentId}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Detalhes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Nome do segmento *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Clientes ativos"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Regras</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Combinar com:</span>
            <Select value={operator} onValueChange={(v) => setOperator(v as "AND" | "OR")}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">E (AND)</SelectItem>
                <SelectItem value="OR">OU (OR)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {conditions.map((condition, index) => (
            <div key={index} className="flex items-end gap-3 p-4 border rounded-lg">
              <div className="flex-1 grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs">Campo</Label>
                  <Select
                    value={condition.field}
                    onValueChange={(v) => v && updateCondition(index, { field: v as ConditionField })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldOptions.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Operador</Label>
                  <Select
                    value={condition.op}
                    onValueChange={(v) => v && updateCondition(index, { op: v as ConditionOperator })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(operatorsByField[condition.field] || []).map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valor</Label>
                  {condition.field === "createdAt" ? (
                    <Input
                      type="date"
                      value={condition.value}
                      onChange={(e) => updateCondition(index, { value: e.target.value })}
                    />
                  ) : condition.field === "unsubscribed" ? (
                    <Select
                      value={condition.value}
                      onValueChange={(v) => updateCondition(index, { value: v ?? "" })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Sim</SelectItem>
                        <SelectItem value="false">Nao</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : condition.field === "source" ? (
                    <Select
                      value={condition.value}
                      onValueChange={(v) => updateCondition(index, { value: v ?? "" })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="form">Formulario</SelectItem>
                        <SelectItem value="import">Importacao</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={condition.value}
                      onChange={(e) => updateCondition(index, { value: e.target.value })}
                      placeholder="Valor"
                    />
                  )}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeCondition(index)}
                disabled={conditions.length === 1}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button type="button" variant="outline" size="sm" onClick={addCondition}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar condicao
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={handlePreview}>
            Preview
          </Button>
          {previewCount !== null && (
            <span className="text-sm text-muted-foreground">
              {previewCount} contato{previewCount !== 1 ? "s" : ""} correspondem
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => router.push("/segments")}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Criando..." : "Criar segmento"}
          </Button>
        </div>
      </div>
    </form>
  );
}
