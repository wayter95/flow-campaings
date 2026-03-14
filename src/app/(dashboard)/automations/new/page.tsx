import { getForms } from "@/services/forms";
import { getTags } from "@/services/contacts";
import { getEmailTemplates } from "@/services/email-templates";
import { FlowCreatorWrapper } from "@/components/flow-builder/flow-creator-wrapper";

export default async function NewAutomationPage() {
  const [forms, tags, templates] = await Promise.all([
    getForms(),
    getTags(),
    getEmailTemplates(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Nova automacao</h1>
        <p className="text-muted-foreground">
          Arraste nodes para o canvas e conecte-os para criar o fluxo
        </p>
      </div>
      <FlowCreatorWrapper
        forms={forms.map((f) => ({ id: f.id, name: f.name }))}
        tags={tags.map((t) => ({ id: t.id, name: t.name }))}
        templates={templates.map((t) => ({ id: t.id, name: t.name, subject: t.subject }))}
      />
    </div>
  );
}
