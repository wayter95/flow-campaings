import sgMail from "@sendgrid/mail";
import { getSendgridCredentials } from "@/services/settings";

/**
 * Envia um email usando as credenciais do workspace.
 * Se o workspace não tiver SendGrid configurado, usa modo mock.
 */
export async function sendEmail({
  to,
  subject,
  html,
  workspaceId,
}: {
  to: string;
  subject: string;
  html: string;
  workspaceId: string;
}) {
  const credentials = await getSendgridCredentials(workspaceId);

  if (!credentials) {
    console.log(`[SendGrid Mock] To: ${to}, Subject: ${subject}`);
    return { success: true, mock: true };
  }

  sgMail.setApiKey(credentials.apiKey);

  const from = credentials.senderName
    ? { email: credentials.senderEmail, name: credentials.senderName }
    : credentials.senderEmail;

  await sgMail.send({
    to,
    from,
    subject,
    html,
  });

  return { success: true };
}

/**
 * Envia emails em massa usando as credenciais do workspace.
 */
export async function sendBulkEmails(
  emails: { to: string; subject: string; html: string }[],
  workspaceId: string
) {
  const credentials = await getSendgridCredentials(workspaceId);

  if (!credentials) {
    console.log(`[SendGrid Mock] Sending ${emails.length} emails`);
    return { success: true, mock: true, count: emails.length };
  }

  sgMail.setApiKey(credentials.apiKey);

  const from = credentials.senderName
    ? { email: credentials.senderEmail, name: credentials.senderName }
    : credentials.senderEmail;

  const messages = emails.map((email) => ({
    to: email.to,
    from,
    subject: email.subject,
    html: email.html,
  }));

  await sgMail.send(messages);

  return { success: true, count: emails.length };
}
