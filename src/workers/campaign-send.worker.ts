import { Worker, Job } from "bullmq";
import { getWorkerConnectionOptions, QUEUE_PREFIX } from "@/lib/queue/connection";
import { QUEUE_NAMES, type CampaignSendJobData } from "@/lib/queue/queues";
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

/**
 * Processes a single contact send (email or WhatsApp) for a campaign.
 * Each contact is a separate job → parallel processing + individual retries.
 */
async function processCampaignSendJob(job: Job<CampaignSendJobData>) {
  const {
    campaignId,
    contactId,
    workspaceId,
    emailLogId,
    channel,
    subject,
    htmlContent,
    campaignName,
  } = job.data;

  // Fetch contact for variable replacement
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
  });

  if (!contact) {
    await prisma.emailLog.update({
      where: { id: emailLogId },
      data: { status: "bounced" },
    });
    return { status: "skipped", reason: "contact_not_found" };
  }

  if (channel === "whatsapp") {
    if (!contact.phone) {
      await prisma.emailLog.update({
        where: { id: emailLogId },
        data: { status: "bounced" },
      });
      return { status: "skipped", reason: "no_phone" };
    }

    const personalizedMessage = replaceVariables(htmlContent, contact);

    const result = await sendWhatsApp({
      to: contact.phone,
      message: personalizedMessage,
      workspaceId,
    });

    if (!result.success) {
      await prisma.emailLog.update({
        where: { id: emailLogId },
        data: { status: "bounced" },
      });
      throw new Error(result.error || "WhatsApp send failed");
    }

    await prisma.emailLog.update({
      where: { id: emailLogId },
      data: { status: "sent", sentAt: new Date() },
    });

    await logActivity({
      type: "whatsapp_sent",
      contactId,
      workspaceId,
      metadata: { campaignId, campaignName, channel: "whatsapp" },
    });

    return { status: "sent", channel: "whatsapp" };
  } else {
    // Email send
    if (contact.unsubscribed) {
      await prisma.emailLog.update({
        where: { id: emailLogId },
        data: { status: "bounced" },
      });
      return { status: "skipped", reason: "unsubscribed" };
    }

    const unsubscribeUrl = generateUnsubscribeUrl(contactId, workspaceId);

    let finalHtml = htmlContent;
    if (!finalHtml.includes("{{unsubscribeUrl}}")) {
      finalHtml = finalHtml + UNSUBSCRIBE_FOOTER;
    }

    const personalizedSubject = replaceVariables(subject || "", contact, { unsubscribeUrl });
    const personalizedHtml = replaceVariables(finalHtml, contact, { unsubscribeUrl });

    await sendEmail({
      to: contact.email,
      subject: personalizedSubject,
      html: personalizedHtml,
      workspaceId,
    });

    await prisma.emailLog.update({
      where: { id: emailLogId },
      data: { status: "sent", sentAt: new Date() },
    });

    await logActivity({
      type: "email_sent",
      contactId,
      workspaceId,
      metadata: { campaignId, campaignName },
    });

    return { status: "sent", channel: "email" };
  }
}

/**
 * Creates and starts the campaign send worker.
 * Concurrency of 5 = 5 sends in parallel per worker instance.
 */
export function createCampaignSendWorker() {
  const worker = new Worker<CampaignSendJobData>(
    QUEUE_NAMES.CAMPAIGN_SEND,
    processCampaignSendJob,
    {
      connection: getWorkerConnectionOptions(),
      prefix: QUEUE_PREFIX,
      concurrency: 5,
      limiter: {
        max: 50, // Max 50 jobs
        duration: 1000, // per 1 second (rate limit: 50/s)
      },
    }
  );

  worker.on("completed", (job) => {
    if (job) {
      console.log(
        `[campaign-send] Job ${job.id} completed: ${job.data.contactId} → ${job.data.channel}`
      );
    }
  });

  worker.on("failed", (job, err) => {
    if (job) {
      console.error(
        `[campaign-send] Job ${job.id} failed (attempt ${job.attemptsMade}/${job.opts.attempts}):`,
        err.message
      );
    }
  });

  worker.on("error", (err) => {
    console.error("[campaign-send] Worker error:", err);
  });

  return worker;
}
