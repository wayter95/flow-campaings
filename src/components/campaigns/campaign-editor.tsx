"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createCampaign, updateCampaign } from "@/services/campaigns";
import { X } from "lucide-react";

interface Segment {
  id: string;
  name: string;
}

interface CampaignEditorProps {
  campaign?: {
    id: string;
    name: string;
    subject: string | null;
    htmlContent: string | null;
    scheduledAt?: Date | null;
  };
  segments?: Segment[];
  selectedSegmentIds?: string[];
}

export function CampaignEditor({ campaign, segments = [], selectedSegmentIds = [] }: CampaignEditorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedSegments, setSelectedSegments] = useState<string[]>(selectedSegmentIds);

  function toggleSegment(id: string) {
    setSelectedSegments((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);

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
            <Label htmlFor="subject">Assunto do email</Label>
            <Input
              id="subject"
              name="subject"
              defaultValue={campaign?.subject || ""}
              placeholder="Assunto que aparece na caixa de entrada"
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

      <Card>
        <CardHeader>
          <CardTitle>Conteudo do email</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="htmlContent">HTML do email</Label>
            <Textarea
              id="htmlContent"
              name="htmlContent"
              defaultValue={campaign?.htmlContent || ""}
              placeholder="<h1>Ola!</h1><p>Conteudo do seu email aqui...</p>"
              rows={15}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Insira o HTML do email. Um editor visual sera adicionado em versoes futuras.
            </p>
          </div>
        </CardContent>
      </Card>

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
