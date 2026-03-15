/**
 * Main entry point for all BullMQ workers.
 * Run with: npx tsx src/workers/index.ts
 *
 * This script starts all workers and listens for shutdown signals
 * to gracefully close connections.
 */

import "dotenv/config";
import { createCampaignSendWorker } from "./campaign-send.worker";
import { createAutomationStepWorker } from "./automation-step.worker";
import { createScheduledCampaignsWorker } from "./scheduled-campaigns.worker";
import { createCampaignCompletionListener } from "./campaign-completion.listener";

console.log("🚀 Starting Flow Campaigns workers...");
console.log(`   Redis: ${process.env.REDIS_URL || "redis://localhost:6379"}`);
console.log(`   PID: ${process.pid}`);
console.log("");

// Start all workers
const campaignSendWorker = createCampaignSendWorker();
console.log("✅ campaign-send worker started (concurrency: 5, rate: 50/s)");

const automationStepWorker = createAutomationStepWorker();
console.log("✅ automation-step worker started (concurrency: 3)");

const scheduledCampaignsWorker = createScheduledCampaignsWorker();
console.log("✅ scheduled-campaigns worker started (concurrency: 2)");

const completionListener = createCampaignCompletionListener();
console.log("✅ campaign-completion listener started");

console.log("");
console.log("All workers running. Press Ctrl+C to stop.");

// Graceful shutdown
async function shutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down workers...`);

  await Promise.allSettled([
    campaignSendWorker.close(),
    automationStepWorker.close(),
    scheduledCampaignsWorker.close(),
    completionListener.close(),
  ]);

  console.log("All workers stopped. Goodbye!");
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
