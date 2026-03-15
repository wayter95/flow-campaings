import { QueueEvents } from "bullmq";
import { getWorkerConnectionOptions, QUEUE_PREFIX } from "@/lib/queue/connection";
import { QUEUE_NAMES } from "@/lib/queue/queues";
import { prisma } from "@/lib/prisma";

/**
 * Listens to campaign-send queue events.
 * When all jobs for a campaign complete, marks the campaign as "sent".
 *
 * Uses a debounce: after each completed job, checks if all logs for
 * that campaign are done (no "queued" status remaining).
 */
export function createCampaignCompletionListener() {
  const queueEvents = new QueueEvents(QUEUE_NAMES.CAMPAIGN_SEND, {
    connection: getWorkerConnectionOptions(),
    prefix: QUEUE_PREFIX,
  });

  // Track campaigns being checked to debounce
  const pendingChecks = new Set<string>();

  queueEvents.on("completed", async ({ jobId, returnvalue }) => {
    try {
      const parsed =
        typeof returnvalue === "string"
          ? JSON.parse(returnvalue)
          : returnvalue;

      // returnvalue may not include campaignId directly, but the job data does
      // We extract it from the jobId pattern: send-{campaignId}-{contactId}
      const match = jobId?.match(/^send-(.+?)-.+$/);
      if (!match) return;

      const campaignId = match[1];

      // Debounce: skip if already checking this campaign
      if (pendingChecks.has(campaignId)) return;
      pendingChecks.add(campaignId);

      // Small delay to batch multiple completions
      setTimeout(async () => {
        pendingChecks.delete(campaignId);

        try {
          // Check if there are any remaining queued logs
          const remainingQueued = await prisma.emailLog.count({
            where: { campaignId, status: "queued" },
          });

          if (remainingQueued === 0) {
            // All sends complete — mark campaign as sent
            const campaign = await prisma.campaign.findUnique({
              where: { id: campaignId },
              select: { status: true },
            });

            if (campaign?.status === "sending") {
              await prisma.campaign.update({
                where: { id: campaignId },
                data: { status: "sent", sentAt: new Date() },
              });
              console.log(
                `[completion-listener] Campaign ${campaignId} marked as sent`
              );
            }
          }
        } catch (err) {
          console.error(
            `[completion-listener] Error checking campaign ${campaignId}:`,
            err
          );
        }
      }, 2000); // 2s debounce
    } catch {
      // Ignore parse errors
    }
  });

  // Also handle failed jobs — if all non-queued, campaign is "done" (with errors)
  queueEvents.on("failed", async ({ jobId }) => {
    const match = jobId?.match(/^send-(.+?)-.+$/);
    if (!match) return;

    const campaignId = match[1];
    if (pendingChecks.has(campaignId)) return;
    pendingChecks.add(campaignId);

    setTimeout(async () => {
      pendingChecks.delete(campaignId);

      try {
        const remainingQueued = await prisma.emailLog.count({
          where: { campaignId, status: "queued" },
        });

        if (remainingQueued === 0) {
          const campaign = await prisma.campaign.findUnique({
            where: { id: campaignId },
            select: { status: true },
          });

          if (campaign?.status === "sending") {
            await prisma.campaign.update({
              where: { id: campaignId },
              data: { status: "sent", sentAt: new Date() },
            });
            console.log(
              `[completion-listener] Campaign ${campaignId} marked as sent (with some failures)`
            );
          }
        }
      } catch (err) {
        console.error(
          `[completion-listener] Error on failed check for ${campaignId}:`,
          err
        );
      }
    }, 2000);
  });

  console.log("[completion-listener] Listening for campaign completion events");

  return queueEvents;
}
