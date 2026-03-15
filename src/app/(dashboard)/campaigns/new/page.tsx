import { CampaignEditor } from "@/components/campaigns/campaign-editor";
import { getSegments } from "@/services/segments";
import { getEmailTemplates } from "@/services/email-templates";

export default async function NewCampaignPage() {
  const [segments, templates] = await Promise.all([
    getSegments(),
    getEmailTemplates(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nova campanha</h1>
        <p className="text-muted-foreground">Crie uma campanha de email</p>
      </div>
      <CampaignEditor
        segments={segments.map((s) => ({ id: s.id, name: s.name }))}
        templates={templates.map((t) => ({
          id: t.id,
          name: t.name,
          subject: t.subject,
          htmlContent: t.htmlContent,
        }))}
      />
    </div>
  );
}
