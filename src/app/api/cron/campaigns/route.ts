import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getScheduledCampaignsQueue } from "@/lib/queue";
import { processDelayedSteps } from "@/services/automation-engine";

/**
 * Cron route for processing scheduled campaigns and delayed automation steps.
 *
 * Instead of sending synchronously, it enqueues campaigns into BullMQ
 * which processes them via workers in the background.
 */
export async function GET(request: NextRequest) {
  // Optional: verify cron secret
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find all scheduled campaigns that are due
  const campaigns = await prisma.campaign.findMany({
    where: {
      status: "scheduled",
      scheduledAt: { lte: now },
    },
    select: { id: true, name: true },
  });

  // Enqueue each campaign for background processing
  const queue = getScheduledCampaignsQueue();
  let enqueued = 0;

  for (const campaign of campaigns) {
    await queue.add(`scheduled-${campaign.id}`, {
      campaignId: campaign.id,
    });
    enqueued++;
    console.log(
      `[cron/campaigns] Enqueued scheduled campaign: ${campaign.name} (${campaign.id})`
    );
  }

  // Process delayed automation steps (safety net for BullMQ delays)
  const automationResult = await processDelayedSteps();

  return NextResponse.json({
    success: true,
    campaignsEnqueued: enqueued,
    automationStepsEnqueued: automationResult.processed,
  });
}
