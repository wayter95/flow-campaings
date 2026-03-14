"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteEmailTemplate } from "@/services/email-templates";

export function TemplateDeleteButton({ templateId }: { templateId: string }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir este template?")) return;
    await deleteEmailTemplate(templateId);
    router.push("/templates");
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      className="h-8 w-8 text-muted-foreground hover:text-destructive"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
