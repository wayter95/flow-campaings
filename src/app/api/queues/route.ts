import { NextRequest, NextResponse } from "next/server";
import {
  getCampaignSendQueue,
  getAutomationStepQueue,
  getScheduledCampaignsQueue,
} from "@/lib/queue";

/**
 * Queue monitoring endpoint.
 * Returns current state of all BullMQ queues.
 * Protected by CRON_SECRET or can be adapted for admin auth.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [campaignSend, automationStep, scheduledCampaigns] = await Promise.all([
    getCampaignSendQueue().getJobCounts(),
    getAutomationStepQueue().getJobCounts(),
    getScheduledCampaignsQueue().getJobCounts(),
  ]);

  return NextResponse.json({
    queues: {
      "campaign-send": campaignSend,
      "automation-step": automationStep,
      "scheduled-campaigns": scheduledCampaigns,
    },
    timestamp: new Date().toISOString(),
  });
}
