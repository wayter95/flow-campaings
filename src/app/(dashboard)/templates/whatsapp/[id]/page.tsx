import { getWhatsAppTemplate } from "@/services/whatsapp-templates";
import { notFound } from "next/navigation";
import { WhatsAppTemplateEditForm } from "@/components/templates/whatsapp-template-edit-form";

interface WhatsAppTemplateEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function WhatsAppTemplateEditPage({ params }: WhatsAppTemplateEditPageProps) {
  const { id } = await params;
  const template = await getWhatsAppTemplate(id);
  if (!template) notFound();

  return (
    <WhatsAppTemplateEditForm
      template={{
        id: template.id,
        name: template.name,
        message: template.message,
      }}
    />
  );
}
