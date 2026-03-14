import { getEmailTemplate } from "@/services/email-templates";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TemplateEditor } from "@/components/templates/template-editor";
import { TemplateDeleteButton } from "@/components/templates/template-delete-button";

interface TemplateDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TemplateDetailPage({ params }: TemplateDetailPageProps) {
  const { id } = await params;
  const template = await getEmailTemplate(id);

  if (!template) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/templates">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{template.name}</h1>
          <p className="text-muted-foreground">{template.subject}</p>
        </div>
        <TemplateDeleteButton templateId={template.id} />
      </div>

      <TemplateEditor template={template} />
    </div>
  );
}
