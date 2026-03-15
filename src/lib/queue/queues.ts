import { Queue } from "bullmq";
import { getConnectionOptions, QUEUE_PREFIX } from "./connection";

/* ─── Queue Names ─── */
export const QUEUE_NAMES = {
  CAMPAIGN_SEND: "campaign-send",
  AUTOMATION_STEP: "automation-step",
  SCHEDULED_CAMPAIGNS: "scheduled-campaigns",
} as const;

/* ─── Job Data Types ─── */

export interface CampaignSendJobData {
  campaignId: string;
  contactId: string;
  workspaceId: string;
  emailLogId: string;
  channel: "email" | "whatsapp";
  subject?: string;
  htmlContent: string;
  campaignName: string;
}

export interface AutomationStepJobData {
  enrollmentId: string;
}

export interface ScheduledCampaignJobData {
  campaignId: string;
}

/* ─── Queue Instances (singletons) ─── */

let _campaignSendQueue: Queue | undefined;
let _automationStepQueue: Queue | undefined;
let _scheduledCampaignsQueue: Queue | undefined;

export function getCampaignSendQueue(): Queue {
  if (!_campaignSendQueue) {
    _campaignSendQueue = new Queue(QUEUE_NAMES.CAMPAIGN_SEND, {
      connection: getConnectionOptions(),
      prefix: QUEUE_PREFIX,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    });
  }
  return _campaignSendQueue;
}

export function getAutomationStepQueue(): Queue {
  if (!_automationStepQueue) {
    _automationStepQueue = new Queue(QUEUE_NAMES.AUTOMATION_STEP, {
      connection: getConnectionOptions(),
      prefix: QUEUE_PREFIX,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 3000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 2000 },
      },
    });
  }
  return _automationStepQueue;
}

export function getScheduledCampaignsQueue(): Queue {
  if (!_scheduledCampaignsQueue) {
    _scheduledCampaignsQueue = new Queue(QUEUE_NAMES.SCHEDULED_CAMPAIGNS, {
      connection: getConnectionOptions(),
      prefix: QUEUE_PREFIX,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "fixed", delay: 5000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 500 },
      },
    });
  }
  return _scheduledCampaignsQueue;
}
