"use server";

import { prisma } from "@/lib/prisma";
import { getWorkspaceId } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sendEmail } from "@/lib/sendgrid";
import { logActivity } from "@/services/activities";
import { evaluateRules, type SegmentRules } from "@/services/segments";
import { replaceVariables } from "@/lib/replace-variables";

const campaignSchema = z.object({
  name: z.string().min(1, "Nome e obrigatorio"),
  subject: z.string().optional(),
  htmlContent: z.string().optional(),
});

export async function getCampaigns() {
  const workspaceId = await getWorkspaceId();
  return prisma.campaign.findMany({
    where: { workspaceId },
    include: {
      template: { select: { id: true, name: true } },
      _count: { select: { emailLogs: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCampaign(id: string) {
  const workspaceId = await getWorkspaceId();
  return prisma.campaign.findFirst({
    where: { id, workspaceId },
    include: {
      template: { select: { id: true, name: true, subject: true, htmlContent: true } },
      emailLogs: {
        include: { contact: true },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { emailLogs: true } },
    },
  });
}

export async function createCampaign(formData: FormData) {
  const workspaceId = await getWorkspaceId();

  const raw = {
    name: formData.get("name") as string,
    subject: (formData.get("subject") as string) || undefined,
    htmlContent: (formData.get("htmlContent") as string) || undefined,
  };

  const result = campaignSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const templateId = (formData.get("templateId") as string) || null;
  const segmentIds = formData.get("segmentIds") as string;
  const scheduledAtStr = formData.get("scheduledAt") as string;
  const scheduledAt = scheduledAtStr ? new Date(scheduledAtStr) : null;

  const campaign = await prisma.campaign.create({
    data: {
      ...result.data,
      workspaceId,
      ...(templateId ? { templateId } : {}),
      ...(scheduledAt ? { scheduledAt, status: "scheduled" } : {}),
      ...(segmentIds
        ? {
            segments: {
              create: JSON.parse(segmentIds).map((segmentId: string) => ({
                segmentId,
              })),
            },
          }
        : {}),
    },
  });

  revalidatePath("/campaigns");
  return { success: true, campaignId: campaign.id, error: null };
}

export async function updateCampaign(id: string, formData: FormData) {
  const scheduledAtStr = formData.get("scheduledAt") as string;
  const scheduledAt = scheduledAtStr ? new Date(scheduledAtStr) : null;
  const templateId = (formData.get("templateId") as string) || null;

  const raw = {
    name: formData.get("name") as string,
    subject: (formData.get("subject") as string) || null,
    htmlContent: (formData.get("htmlContent") as string) || null,
    templateId,
    scheduledAt,
    ...(scheduledAt ? { status: "scheduled" } : {}),
  };

  await prisma.campaign.update({
    where: { id },
    data: raw,
  });

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${id}`);
  return { success: true, error: null };
}

export async function deleteCampaign(id: string) {
  await prisma.campaign.delete({ where: { id } });
  revalidatePath("/campaigns");
  return { success: true };
}

export async function sendCampaign(id: string) {
  const workspaceId = await getWorkspaceId();

  const campaign = await prisma.campaign.findFirst({
    where: { id, workspaceId },
    include: {
      template: true,
      segments: { include: { segment: true } },
    },
  });

  if (!campaign) return { error: "Campanha nao encontrada" };
  if (campaign.status === "sent") return { error: "Campanha ja foi enviada" };
  if (campaign.status === "sending") return { error: "Campanha esta sendo enviada" };

  // Resolve subject and html: campaign fields take priority, fallback to template
  const subject = campaign.subject || campaign.template?.subject;
  const htmlContent = campaign.htmlContent || campaign.template?.htmlContent;

  if (!subject) return { error: "Assunto e obrigatorio. Defina no campanha ou vincule um template." };
  if (!htmlContent) return { error: "Conteudo do email e obrigatorio. Defina na campanha ou vincule um template." };

  // Get contacts: from segments or all
  let contacts;
  if (campaign.segments.length > 0) {
    const allSegmentContacts = await Promise.all(
      campaign.segments.map((cs) =>
        evaluateRules(cs.segment.rules as unknown as SegmentRules, workspaceId)
      )
    );
    // Deduplicate by contact id
    const seen = new Set<string>();
    contacts = allSegmentContacts.flat().filter((c) => {
      if (seen.has(c.id) || c.unsubscribed) return false;
      seen.add(c.id);
      return true;
    });
  } else {
    contacts = await prisma.contact.findMany({
      where: { workspaceId, unsubscribed: false },
    });
  }

  if (contacts.length === 0) return { error: "Nenhum contato para enviar" };

  await prisma.campaign.update({
    where: { id },
    data: { status: "sending" },
  });

  let sentCount = 0;
  let errorCount = 0;

  for (const contact of contacts) {
    const emailLog = await prisma.emailLog.create({
      data: {
        campaignId: id,
        contactId: contact.id,
        workspaceId,
        status: "queued",
      },
    });

    try {
      // Replace variables per contact
      const personalizedSubject = replaceVariables(subject, contact);
      const personalizedHtml = replaceVariables(htmlContent, contact);

      await sendEmail({
        to: contact.email,
        subject: personalizedSubject,
        html: personalizedHtml,
        workspaceId,
      });

      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: { status: "sent", sentAt: new Date() },
      });

      await logActivity({
        type: "email_sent",
        contactId: contact.id,
        workspaceId,
        metadata: { campaignId: id, campaignName: campaign.name },
      });

      sentCount++;
    } catch {
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: { status: "bounced" },
      });
      errorCount++;
    }
  }

  await prisma.campaign.update({
    where: { id },
    data: { status: "sent", sentAt: new Date() },
  });

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${id}`);
  return { success: true, sentCount, errorCount };
}
