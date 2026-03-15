"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteAutomation } from "@/services/automations";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function AutomationDeleteButton({ automationId }: { automationId: string }) {
  const router = useRouter();
  const { confirm } = useConfirm();

  async function handleDelete() {
    const ok = await confirm({
      title: "Excluir automacao",
      description: "Tem certeza que deseja excluir esta automacao?",
      confirmLabel: "Excluir",
      variant: "destructive",
    });
    if (!ok) return;
    await deleteAutomation(automationId);
    router.push("/automations");
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
