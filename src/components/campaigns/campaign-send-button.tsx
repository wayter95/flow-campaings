"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { sendCampaign } from "@/services/campaigns";

export function CampaignSendButton({ campaignId }: { campaignId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSend() {
    if (!confirm("Tem certeza que deseja enviar esta campanha agora?")) return;

    setLoading(true);
    const result = await sendCampaign(campaignId);

    if (result.error) {
      alert(result.error);
      setLoading(false);
      return;
    }

    alert(`Campanha enviada! ${result.sentCount} emails enviados.`);
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
