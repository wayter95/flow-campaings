import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/sendgrid";
import { sendWhatsApp } from "@/lib/evolution";
import { logActivity } from "@/services/activities";
import { replaceVariables } from "@/lib/replace-variables";
import { generateUnsubscribeUrl } from "@/lib/unsubscribe";

const UNSUBSCRIBE_FOOTER = `<div style="text-align:center;padding:20px;font-size:12px;color:#999;">
  <p>Voce esta recebendo este email porque se inscreveu em nossa lista.</p>
  <p><a href="{{unsubscribeUrl}}" style="color:#666;">Cancelar inscricao</a></p>
</div>`;

export async function GET(request: NextRequest) {
  // Optional: verify cron secret
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const campaigns = await prisma.campaign.findMany({
    where: {
      status: "scheduled",
      scheduledAt: { lte: now },
    },
    include: {
      segments: { include: { segment: true } },
    },
  });

  let totalSent = 0;

  for (const campaign of campaigns) {
    const isWhatsApp = campaign.channel === "whatsapp";

    if (!isWhatsApp && (!campaign.subject || !campaign.htmlContent)) continue;
    if (isWhatsApp && !campaign.htmlContent) continue;

    // Atomic status transition to prevent double processing
    const transitioned = await prisma.campaign.updateMany({
      where: { id: campaign.id, status: "scheduled" },
      data: { status: "sending" },
    });
    if (transitioned.count === 0) continue;

    const contacts = await prisma.contact.findMany({
      where: { workspaceId: campaign.workspaceId, unsubscribed: false },
    });

    for (const contact of contacts) {
      // Skip contacts without phone for WhatsApp campaigns
      if (isWhatsApp && !contact.phone) continue;

      const emailLog = await prisma.emailLog.create({
        data: {
          campaignId: campaign.id,
          contactId: contact.id,
          workspaceId: campaign.workspaceId,
          status: "queued",
        },
      });

      try {
        if (isWhatsApp) {
          const personalizedMessage = replaceVariables(campaign.htmlContent!, contact);

          await sendWhatsApp({
            to: contact.phone!,
            message: personalizedMessage,
            workspaceId: campaign.workspaceId,
          });

          await prisma.emailLog.update({
            where: { id: emailLog.id },
            data: { status: "sent", sentAt: new Date() },
          });

          await logActivity({
            type: "whatsapp_sent",
            contactId: contact.id,
            workspaceId: campaign.workspaceId,
            metadata: { campaignId: campaign.id, campaignName: campaign.name, channel: "whatsapp" },
          });
        } else {
          // Generate unsubscribe URL per contact
          const unsubscribeUrl = generateUnsubscribeUrl(contact.id, campaign.workspaceId);

          // Auto-append unsubscribe footer if not already present
          let finalHtml = campaign.htmlContent!;
          if (!finalHtml.includes("{{unsubscribeUrl}}")) {
            finalHtml = finalHtml + UNSUBSCRIBE_FOOTER;
          }

          // Replace variables per contact
          const personalizedSubject = replaceVariables(campaign.subject!, contact, { unsubscribeUrl });
          const personalizedHtml = replaceVariables(finalHtml, contact, { unsubscribeUrl });

          await sendEmail({
            to: contact.email,
            subject: personalizedSubject,
            html: personalizedHtml,
            workspaceId: campaign.workspaceId,
          });

          await prisma.emailLog.update({
            where: { id: emailLog.id },
            data: { status: "sent", sentAt: new Date() },
          });

          await logActivity({
            type: "email_sent",
            contactId: contact.id,
            workspaceId: campaign.workspaceId,
            metadata: { campaignId: campaign.id, campaignName: campaign.name },
          });
        }

        totalSent++;
      } catch {
        await prisma.emailLog.update({
          where: { id: emailLog.id },
          data: { status: "bounced" },
        });
      }
    }

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: "sent", sentAt: new Date() },
    });
  }

  // Process delayed automation steps
  const { processDelayedSteps } = await import("@/services/automation-engine");
  const automationResult = await processDelayedSteps();

  return NextResponse.json({
    success: true,
    campaignsProcessed: campaigns.length,
    totalSent,
    automationStepsProcessed: automationResult.processed,
  });
}
