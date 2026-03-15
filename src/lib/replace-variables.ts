/**
 * Replaces template variables like {{firstName}}, {{lastName}}, {{email}}, {{phone}}
 * in a string with actual contact data.
 */
export function replaceVariables(
  text: string,
  contact: { email: string; firstName: string | null; lastName: string | null; phone?: string | null }
): string {
  return text
    .replace(/\{\{firstName\}\}/g, contact.firstName || "")
    .replace(/\{\{lastName\}\}/g, contact.lastName || "")
    .replace(/\{\{email\}\}/g, contact.email)
    .replace(/\{\{phone\}\}/g, contact.phone || "");
}
