"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FlaskConical, Loader2, Check, X } from "lucide-react";
import { sendTestEmail } from "@/services/campaigns";

interface CampaignTestButtonProps {
  campaignId: string;
}

export function CampaignTestButton({ campaignId }: CampaignTestButtonProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function handleSend() {
    if (!email) return;
    setLoading(true);
    setFeedback(null);

    const result = await sendTestEmail(campaignId, email);

    if (result.error) {
      setFeedback({ type: "error", message: result.error });
    } else {
      setFeedback({ type: "success", message: "Email de teste enviado!" });
    }
    setLoading(false);
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FlaskConical className="h-4 w-4 mr-2" />
        Enviar teste
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="email"
        placeholder="email@exemplo.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-64"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSend();
        }}
      />
      <Button onClick={handleSend} disabled={loading || !email} size="sm">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          "Enviar"
        )}
      </Button>
      <Button variant="ghost" size="icon" onClick={() => { setOpen(false); setFeedback(null); }}>
        <X className="h-4 w-4" />
      </Button>
      {feedback && (
        <span className={`text-sm flex items-center gap-1 ${feedback.type === "success" ? "text-green-600" : "text-destructive"}`}>
          {feedback.type === "success" ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
          {feedback.message}
        </span>
      )}
    </div>
  );
}
