import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/sendgrid";
import { sendWhatsApp } from "@/lib/evolution";
import { logActivity } from "@/services/activities";
import { replaceVariables } from "@/lib/replace-variables";

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

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: "sending" },
    });

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
          const personalizedSubject = replaceVariables(campaign.subject!, contact);
          const personalizedHtml = replaceVariables(campaign.htmlContent!, contact);

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

  return NextResponse.json({
    success: true,
    campaignsProcessed: campaigns.length,
    totalSent,
  });
}
