"use server";

import { prisma } from "@/lib/prisma";
import { getWorkspaceId } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sendEmail } from "@/lib/sendgrid";
import { sendWhatsApp } from "@/lib/evolution";
import { logActivity } from "@/services/activities";
import { evaluateRules, type SegmentRules } from "@/services/segments";
import { replaceVariables } from "@/lib/replace-variables";
import { generateUnsubscribeUrl } from "@/lib/unsubscribe";

const UNSUBSCRIBE_FOOTER = `<div style="text-align:center;padding:20px;font-size:12px;color:#999;">
  <p>Voce esta recebendo este email porque se inscreveu em nossa lista.</p>
  <p><a href="{{unsubscribeUrl}}" style="color:#666;">Cancelar inscricao</a></p>
</div>`;

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

  const channel = (formData.get("channel") as string) || "email";

  const campaign = await prisma.campaign.create({
    data: {
      ...result.data,
      channel,
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
  const channel = (formData.get("channel") as string) || undefined;

  const raw = {
    name: formData.get("name") as string,
    subject: (formData.get("subject") as string) || null,
    htmlContent: (formData.get("htmlContent") as string) || null,
    templateId,
    scheduledAt,
    ...(channel ? { channel } : {}),
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

  const isWhatsApp = campaign.channel === "whatsapp";

  // Resolve subject and html: campaign fields take priority, fallback to template
  const subject = campaign.subject || campaign.template?.subject;
  const htmlContent = campaign.htmlContent || campaign.template?.htmlContent;

  if (!isWhatsApp) {
    if (!subject) return { error: "Assunto e obrigatorio. Defina no campanha ou vincule um template." };
    if (!htmlContent) return { error: "Conteudo do email e obrigatorio. Defina na campanha ou vincule um template." };
  } else {
    // For WhatsApp, htmlContent stores the message text
    if (!htmlContent) return { error: "Mensagem do WhatsApp e obrigatoria." };
  }

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
    // For WhatsApp, skip contacts without phone
    if (isWhatsApp && !contact.phone) {
      errorCount++;
      continue;
    }

    const emailLog = await prisma.emailLog.create({
      data: {
        campaignId: id,
        contactId: contact.id,
        workspaceId,
        status: "queued",
      },
    });

    try {
      if (isWhatsApp) {
        // WhatsApp send
        const personalizedMessage = replaceVariables(htmlContent!, contact);

        await sendWhatsApp({
          to: contact.phone!,
          message: personalizedMessage,
          workspaceId,
        });

        await prisma.emailLog.update({
          where: { id: emailLog.id },
          data: { status: "sent", sentAt: new Date() },
        });

        await logActivity({
          type: "whatsapp_sent",
          contactId: contact.id,
          workspaceId,
          metadata: {
            campaignId: id,
            campaignName: campaign.name,
            channel: "whatsapp",
          },
        });
      } else {
        // Email send
        // Generate unsubscribe URL per contact
        const unsubscribeUrl = generateUnsubscribeUrl(contact.id, workspaceId);

        // Auto-append unsubscribe footer if not already present
        let finalHtml = htmlContent!;
        if (!finalHtml.includes("{{unsubscribeUrl}}")) {
          finalHtml = finalHtml + UNSUBSCRIBE_FOOTER;
        }

        // Replace variables per contact
        const personalizedSubject = replaceVariables(subject!, contact, { unsubscribeUrl });
        const personalizedHtml = replaceVariables(finalHtml, contact, { unsubscribeUrl });

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
      }

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

export async function sendTestEmail(campaignId: string, testEmail: string) {
  const workspaceId = await getWorkspaceId();

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, workspaceId },
    include: { template: true },
  });

  if (!campaign) return { error: "Campanha nao encontrada" };

  const subject = campaign.subject || campaign.template?.subject;
  const htmlContent = campaign.htmlContent || campaign.template?.htmlContent;

  if (!subject) return { error: "Assunto e obrigatorio. Defina na campanha ou vincule um template." };
  if (!htmlContent) return { error: "Conteudo do email e obrigatorio. Defina na campanha ou vincule um template." };

  const mockContact = {
    email: testEmail,
    firstName: "Teste",
    lastName: "Usuario",
    phone: "",
  };

  try {
    const personalizedSubject = replaceVariables(subject, mockContact);
    const personalizedHtml = replaceVariables(htmlContent, mockContact);

    await sendEmail({
      to: testEmail,
      subject: `[TESTE] ${personalizedSubject}`,
      html: personalizedHtml,
      workspaceId,
    });

    return { success: true };
  } catch {
    return { error: "Falha ao enviar email de teste. Verifique suas configuracoes de email." };
  }
}

export async function getCampaignsWithMetrics() {
  const workspaceId = await getWorkspaceId();
  const campaigns = await prisma.campaign.findMany({
    where: { workspaceId },
    include: {
      template: { select: { id: true, name: true } },
      emailLogs: {
        select: { status: true, openedAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return campaigns.map((campaign) => {
    const totalSent = campaign.emailLogs.filter((l) => l.status !== "queued").length;
    const totalOpened = campaign.emailLogs.filter((l) => l.openedAt).length;
    const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : null;
    return {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      sentAt: campaign.sentAt,
      createdAt: campaign.createdAt,
      template: campaign.template,
      totalSent,
      openRate,
    };
  });
}
