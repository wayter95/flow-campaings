import sgMail from "@sendgrid/mail";

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const fromEmail = process.env.SENDGRID_FROM_EMAIL || "noreply@example.com";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[SendGrid Mock] To: ${to}, Subject: ${subject}`);
    return { success: true, mock: true };
  }

  await sgMail.send({
    to,
    from: fromEmail,
    subject,
    html,
  });

  return { success: true };
}

export async function sendBulkEmails(
  emails: { to: string; subject: string; html: string }[]
) {
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[SendGrid Mock] Sending ${emails.length} emails`);
    return { success: true, mock: true, count: emails.length };
  }

  const messages = emails.map((email) => ({
    to: email.to,
    from: fromEmail,
    subject: email.subject,
    html: email.html,
  }));

  await sgMail.send(messages);

  return { success: true, count: emails.length };
}
