import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/services/activities";

interface SendGridEvent {
  event: string;
  email: string;
  sg_message_id?: string;
  timestamp?: number;
}

export async function POST(request: NextRequest) {
  try {
    const events: SendGridEvent[] = await request.json();

    for (const event of events) {
      const emailLog = await prisma.emailLog.findFirst({
        where: {
          contact: { email: event.email },
          status: { not: "queued" },
        },
        orderBy: { createdAt: "desc" },
        include: { contact: true },
      });

      if (!emailLog) continue;

      switch (event.event) {
        case "delivered":
          await prisma.emailLog.update({
            where: { id: emailLog.id },
            data: { status: "delivered" },
          });
          break;

        case "open":
          await prisma.emailLog.update({
            where: { id: emailLog.id },
            data: { openedAt: new Date(), status: "delivered" },
          });
          await logActivity({
            type: "email_opened",
            contactId: emailLog.contactId,
            workspaceId: emailLog.workspaceId,
            metadata: { campaignId: emailLog.campaignId },
          });
          break;

        case "click":
          await prisma.emailLog.update({
            where: { id: emailLog.id },
            data: { clickedAt: new Date() },
          });
          await logActivity({
            type: "email_clicked",
            contactId: emailLog.contactId,
            workspaceId: emailLog.workspaceId,
            metadata: { campaignId: emailLog.campaignId },
          });
          break;

        case "bounce":
        case "dropped":
          await prisma.emailLog.update({
            where: { id: emailLog.id },
            data: { status: "bounced" },
          });
          await logActivity({
            type: "email_bounced",
            contactId: emailLog.contactId,
            workspaceId: emailLog.workspaceId,
            metadata: { campaignId: emailLog.campaignId },
          });
          break;

        case "unsubscribe":
        case "group_unsubscribe":
          await prisma.contact.update({
            where: { id: emailLog.contactId },
            data: { unsubscribed: true },
          });
          await logActivity({
            type: "unsubscribed",
            contactId: emailLog.contactId,
            workspaceId: emailLog.workspaceId,
          });
          break;
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Erro ao processar webhook" }, { status: 500 });
  }
}
