"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { sendCampaign } from "@/services/campaigns";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function CampaignSendButton({ campaignId }: { campaignId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { confirm, alert } = useConfirm();

  async function handleSend() {
    const ok = await confirm({
      title: "Enviar campanha",
      description: "Tem certeza que deseja enviar esta campanha agora?",
      confirmLabel: "Enviar agora",
      variant: "default",
    });
    if (!ok) return;

    setLoading(true);
    const result = await sendCampaign(campaignId);

    if (result.error) {
      await alert({
        title: "Erro ao enviar",
        description: result.error,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    await alert({
      title: "Campanha enviada!",
      description: `${result.sentCount} emails enviados com sucesso.`,
      variant: "success",
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <Button onClick={handleSend} disabled={loading}>
      <Send className="h-4 w-4 mr-2" />
      {loading ? "Enviando..." : "Enviar campanha"}
    </Button>
  );
}
