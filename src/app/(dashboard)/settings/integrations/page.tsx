import { getEmailSettings, getWhatsAppSettings } from "@/services/settings";
import { EmailSettingsForm } from "@/components/settings/email-settings-form";
import { WhatsAppSettingsForm } from "@/components/settings/whatsapp-settings-form";

export default async function IntegrationsSettingsPage() {
  const [emailSettings, whatsappSettings] = await Promise.all([
    getEmailSettings(),
    getWhatsAppSettings(),
  ]);

  return (
    <div className="space-y-6">
      <EmailSettingsForm initialData={emailSettings} />
      <WhatsAppSettingsForm initialData={whatsappSettings} />
    </div>
  );
}
