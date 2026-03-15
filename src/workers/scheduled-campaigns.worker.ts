import { Worker, Job } from "bullmq";
import { getWorkerConnectionOptions, QUEUE_PREFIX } from "@/lib/queue/connection";
import {
  QUEUE_NAMES,
  type ScheduledCampaignJobData,
} from "@/lib/queue/queues";
import { getCampaignSendQueue } from "@/lib/queue/queues";
import { prisma } from "@/lib/prisma";
import { evaluateRules, type SegmentRules } from "@/services/segments";

/**
 * Processes a scheduled campaign by:
 * 1. Atomically transitioning status to "sending"
 * 2. Resolving contacts (segments or all)
 * 3. Creating EmailLog records
 * 4. Enqueuing individual send jobs for each contact
 *
 * The actual sending is done by the campaign-send worker.
 */
async function processScheduledCampaignJob(
  job: Job<ScheduledCampaignJobData>
) {
  const { campaignId } = job.data;

  // Atomic status transition
  const transitioned = await prisma.campaign.updateMany({
    where: { id: campaignId, status: { in: ["draft", "scheduled"] } },
    data: { status: "sending" },
  });

  if (transitioned.count === 0) {
    return { status: "skipped", reason: "already_processing" };
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      template: true,
      segments: { include: { segment: true } },
    },
  });

  if (!campaign) {
    return { status: "skipped", reason: "not_found" };
  }

  const isWhatsApp = campaign.channel === "whatsapp";
  const subject = campaign.subject || campaign.template?.subject || "";
  const htmlContent =
    campaign.htmlContent || campaign.template?.htmlContent || "";

  if (!htmlContent) {
    // Revert to draft — no content to send
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "draft" },
    });
    return { status: "error", reason: "no_content" };
  }

  // Resolve contacts
  let contacts;
  if (campaign.segments.length > 0) {
    const allSegmentContacts = await Promise.all(
      campaign.segments.map((cs) =>
        evaluateRules(
          cs.segment.rules as unknown as SegmentRules,
          campaign.workspaceId
        )
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
      where: { workspaceId: campaign.workspaceId, unsubscribed: false },
    });
  }

  if (contacts.length === 0) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "sent", sentAt: new Date() },
    });
    return { status: "completed", enqueued: 0 };
  }

  // Create EmailLog records and enqueue send jobs in batches
  const queue = getCampaignSendQueue();
  const BATCH_SIZE = 100;
  let enqueued = 0;

  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);

    // Filter: WhatsApp needs phone
    const validContacts = isWhatsApp
      ? batch.filter((c) => c.phone)
      : batch;

    // Create EmailLog records in batch
    const emailLogs = await prisma.emailLog.createManyAndReturn({
      data: validContacts.map((c) => ({
        campaignId,
        contactId: c.id,
        workspaceId: campaign.workspaceId,
        status: "queued" as const,
      })),
    });

    // Enqueue send jobs
    const jobs = emailLogs.map((log, idx) => ({
      name: `send-${campaignId}-${log.contactId}`,
      data: {
        campaignId,
        contactId: validContacts[idx].id,
        workspaceId: campaign.workspaceId,
        emailLogId: log.id,
        channel: (isWhatsApp ? "whatsapp" : "email") as "email" | "whatsapp",
        subject: isWhatsApp ? undefined : subject,
        htmlContent,
        campaignName: campaign.name,
      },
    }));

    await queue.addBulk(jobs);
    enqueued += jobs.length;

    // Report progress
    await job.updateProgress(
      Math.round(((i + batch.length) / contacts.length) * 100)
    );
  }

  console.log(
    `[scheduled-campaigns] Campaign ${campaignId} "${campaign.name}" → ${enqueued} send jobs enqueued`
  );

  return { status: "enqueued", total: enqueued };
}

/* ─── Worker factory ─── */

export function createScheduledCampaignsWorker() {
  const worker = new Worker<ScheduledCampaignJobData>(
    QUEUE_NAMES.SCHEDULED_CAMPAIGNS,
    processScheduledCampaignJob,
    {
      connection: getWorkerConnectionOptions(),
      prefix: QUEUE_PREFIX,
      concurrency: 2, // Process 2 campaigns in parallel
    }
  );

  worker.on("completed", (job) => {
    if (job) {
      console.log(
        `[scheduled-campaigns] Job ${job.id} completed for campaign ${job.data.campaignId}`
      );
    }
  });

  worker.on("failed", (job, err) => {
    if (job) {
      console.error(
        `[scheduled-campaigns] Job ${job.id} failed for campaign ${job.data.campaignId}:`,
        err.message
      );
      // Revert campaign status on failure
      prisma.campaign
        .update({
          where: { id: job.data.campaignId },
          data: { status: "draft" },
        })
        .catch(console.error);
    }
  });

  worker.on("error", (err) => {
    console.error("[scheduled-campaigns] Worker error:", err);
  });

  return worker;
}
