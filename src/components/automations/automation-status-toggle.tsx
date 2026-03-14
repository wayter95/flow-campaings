"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toggleAutomationStatus } from "@/services/automations";
import { Power } from "lucide-react";

export function AutomationStatusToggle({
  automationId,
  currentStatus,
}: {
  automationId: string;
  currentStatus: string;
}) {
  const router = useRouter();

  async function handleToggle() {
    await toggleAutomationStatus(automationId);
    router.refresh();
  }

  const isActive = currentStatus === "active";

  return (
    <Button
      variant={isActive ? "destructive" : "default"}
      size="sm"
      onClick={handleToggle}
    >
      <Power className="h-4 w-4 mr-2" />
      {isActive ? "Desativar" : "Ativar"}
    </Button>
  );
}
