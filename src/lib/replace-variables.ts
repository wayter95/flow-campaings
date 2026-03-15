/**
 * Replaces template variables like {{firstName}}, {{lastName}}, {{email}}, {{phone}}, {{unsubscribeUrl}}
 * in a string with actual contact data.
 */
export function replaceVariables(
  text: string,
  contact: { email: string; firstName: string | null; lastName: string | null; phone?: string | null },
  options?: { unsubscribeUrl?: string }
): string {
  let result = text
    .replace(/\{\{firstName\}\}/g, contact.firstName || "")
    .replace(/\{\{lastName\}\}/g, contact.lastName || "")
    .replace(/\{\{email\}\}/g, contact.email)
    .replace(/\{\{phone\}\}/g, contact.phone || "");

  if (options?.unsubscribeUrl) {
    result = result.replace(/\{\{unsubscribeUrl\}\}/g, options.unsubscribeUrl);
  }

  return result;
}
