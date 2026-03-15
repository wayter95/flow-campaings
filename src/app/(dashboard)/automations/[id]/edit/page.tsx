import { getAutomation } from "@/services/automations";
import { getForms } from "@/services/forms";
import { getTags } from "@/services/contacts";
import { getEmailTemplates } from "@/services/email-templates";
import { getWhatsAppTemplates } from "@/services/whatsapp-templates";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { FlowEditorWrapper } from "@/components/flow-builder/flow-editor-wrapper";

interface EditAutomationPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAutomationPage({ params }: EditAutomationPageProps) {
  const { id } = await params;

  const [automation, forms, tags, templates, whatsappTemplates] = await Promise.all([
    getAutomation(id),
    getForms(),
    getTags(),
    getEmailTemplates(),
    getWhatsAppTemplates(),
  ]);

  if (!automation) notFound();

  const trigger = automation.trigger as unknown as { type: string; formId?: string; tagId?: string };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link href={`/automations/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Editar fluxo: {automation.name}</h1>
          <p className="text-muted-foreground">
            Arraste nodes para o canvas e conecte-os
          </p>
        </div>
      </div>

      <FlowEditorWrapper
        automationId={automation.id}
        automationName={automation.name}
        trigger={trigger}
        steps={automation.steps.map((s) => ({
          type: s.type,
          config: s.config as Record<string, unknown>,
          order: s.order,
        }))}
        flowData={automation.flowData as { nodes: unknown[]; edges: unknown[] } | null}
        forms={forms.map((f) => ({ id: f.id, name: f.name }))}
        tags={tags.map((t) => ({ id: t.id, name: t.name }))}
        templates={templates.map((t) => ({ id: t.id, name: t.name, subject: t.subject }))}
        whatsappTemplates={whatsappTemplates.map((t) => ({ id: t.id, name: t.name, message: t.message }))}
      />
    </div>
  );
}
