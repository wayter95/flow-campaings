/**
 * Utility functions for generating and parsing unsubscribe tokens.
 * Tokens are base64-encoded strings containing contactId:workspaceId.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export function generateUnsubscribeUrl(contactId: string, workspaceId: string): string {
  const token = Buffer.from(`${contactId}:${workspaceId}`).toString("base64url");
  return `${APP_URL}/api/unsubscribe/${token}`;
}

export function parseUnsubscribeToken(token: string): { contactId: string; workspaceId: string } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const [contactId, workspaceId] = decoded.split(":");

    if (!contactId || !workspaceId) return null;

    return { contactId, workspaceId };
  } catch {
    return null;
  }
}
