"use server";

import { prisma } from "@/lib/prisma";
import { getWorkspaceId } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sendEmail } from "@/lib/sendgrid";
import { evaluateRules, type SegmentRules } from "@/services/segments";
import { replaceVariables } from "@/lib/replace-variables";
import { generateUnsubscribeUrl } from "@/lib/unsubscribe";
import { getCampaignSendQueue } from "@/lib/queue";

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

  if (scheduledAt && scheduledAt < new Date()) {
    return { error: "A data de agendamento deve ser no futuro" };
  }

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
  const workspaceId = await getWorkspaceId();

  const existing = await prisma.campaign.findFirst({ where: { id, workspaceId } });
  if (!existing) return { error: "Campanha nao encontrada" };
  if (existing.status === "sent" || existing.status === "sending") {
    return { error: "Nao e possivel editar uma campanha ja enviada" };
  }

  const scheduledAtStr = formData.get("scheduledAt") as string;
  const scheduledAt = scheduledAtStr ? new Date(scheduledAtStr) : null;

  if (scheduledAt && scheduledAt < new Date()) {
    return { error: "A data de agendamento deve ser no futuro" };
  }

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
  const workspaceId = await getWorkspaceId();
  const campaign = await prisma.campaign.findFirst({ where: { id, workspaceId } });
  if (!campaign) return { error: "Campanha nao encontrada" };
  await prisma.campaign.delete({ where: { id } });
  revalidatePath("/campaigns");
  return { success: true };
}

export async function sendCampaign(id: string) {
  const workspaceId = await getWorkspaceId();

  // Atomic status transition to prevent double sends
  const updated = await prisma.campaign.updateMany({
    where: { id, workspaceId, status: { in: ["draft", "scheduled"] } },
    data: { status: "sending" },
  });
  if (updated.count === 0) {
    return { error: "Campanha ja foi enviada ou esta sendo enviada" };
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id, workspaceId },
    include: {
      template: true,
      segments: { include: { segment: true } },
    },
  });

  if (!campaign) return { error: "Campanha nao encontrada" };

  const isWhatsApp = campaign.channel === "whatsapp";

  // Resolve subject and html: campaign fields take priority, fallback to template
  const subject = campaign.subject || campaign.template?.subject || "";
  const htmlContent = campaign.htmlContent || campaign.template?.htmlContent || "";

  if (!isWhatsApp) {
    if (!subject) return { error: "Assunto e obrigatorio. Defina no campanha ou vincule um template." };
    if (!htmlContent) return { error: "Conteudo do email e obrigatorio. Defina na campanha ou vincule um template." };
  } else {
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

  if (contacts.length === 0) {
    await prisma.campaign.update({ where: { id }, data: { status: "draft" } });
    return { error: "Nenhum contato para enviar" };
  }

  // Filter: WhatsApp needs phone
  const validContacts = isWhatsApp
    ? contacts.filter((c) => c.phone)
    : contacts;

  if (validContacts.length === 0) {
    await prisma.campaign.update({ where: { id }, data: { status: "draft" } });
    return { error: "Nenhum contato valido para enviar" };
  }

  // Enqueue send jobs via BullMQ (non-blocking!)
  const queue = getCampaignSendQueue();
  const BATCH_SIZE = 100;
  let enqueued = 0;

  for (let i = 0; i < validContacts.length; i += BATCH_SIZE) {
    const batch = validContacts.slice(i, i + BATCH_SIZE);

    // Create EmailLog records in batch
    const emailLogs = await prisma.emailLog.createManyAndReturn({
      data: batch.map((c) => ({
        campaignId: id,
        contactId: c.id,
        workspaceId,
        status: "queued" as const,
      })),
    });

    // Enqueue send jobs
    const jobs = emailLogs.map((log, idx) => ({
      name: `send-${id}-${batch[idx].id}`,
      data: {
        campaignId: id,
        contactId: batch[idx].id,
        workspaceId,
        emailLogId: log.id,
        channel: (isWhatsApp ? "whatsapp" : "email") as "email" | "whatsapp",
        subject: isWhatsApp ? undefined : subject,
        htmlContent,
        campaignName: campaign.name,
      },
    }));

    await queue.addBulk(jobs);
    enqueued += jobs.length;
  }

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${id}`);
  return {
    success: true,
    sentCount: enqueued,
    errorCount: 0,
    queued: true,
  };
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
      channel: campaign.channel,
      template: campaign.template,
      totalSent,
      openRate,
    };
  });
}
