"use server";

import { prisma } from "@/lib/prisma";
import { enrollContact } from "@/services/automation-engine";

type TriggerType = "form_submitted" | "tag_added" | "contact_created" | "manual";

interface TriggerPayload {
  formId?: string;
  tagId?: string;
  contactId: string;
}

export async function dispatchTrigger(
  type: TriggerType,
  payload: TriggerPayload,
  workspaceId: string
) {
  // Find active automations matching this trigger
  const automations = await prisma.automation.findMany({
    where: {
      workspaceId,
      status: "active",
    },
  });

  const matchingAutomations = automations.filter((automation) => {
    const trigger = automation.trigger as unknown as { type: string; formId?: string; tagId?: string };

    if (trigger.type !== type) return false;

    switch (type) {
      case "form_submitted":
        return trigger.formId === payload.formId;
      case "tag_added":
        return trigger.tagId === payload.tagId;
      case "contact_created":
        return true;
      default:
        return false;
    }
  });

  // Enroll the contact in each matching automation
  for (const automation of matchingAutomations) {
    await enrollContact(automation.id, payload.contactId);
  }

  return { enrolled: matchingAutomations.length };
}
