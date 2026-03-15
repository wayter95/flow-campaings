"use server";

import { prisma } from "@/lib/prisma";
import { getAutomationStepQueue } from "@/lib/queue";

/**
 * Automation engine — refactored to use BullMQ queues.
 *
 * enrollContact() creates the enrollment and enqueues the first step.
 * processDelayedSteps() finds overdue enrollments and enqueues them.
 * Actual step execution is handled by the automation-step worker.
 */

interface TriggerConfig {
  type: "form_submitted" | "tag_added" | "contact_created" | "manual";
  formId?: string;
  tagId?: string;
}

/**
 * Enrolls a contact in an automation and enqueues the first step.
 * If already enrolled but stuck (active + step 0 + no nextRunAt), re-enqueues the job.
 */
export async function enrollContact(automationId: string, contactId: string) {
  const existing = await prisma.automationEnrollment.findUnique({
    where: { contactId_automationId: { contactId, automationId } },
  });

  if (existing) {
    // If enrollment is stuck at step 0 with no pending delay, re-enqueue
    const isStuck =
      existing.status === "active" &&
      existing.currentStep === 0 &&
      !existing.nextRunAt;

    if (isStuck) {
      try {
        await getAutomationStepQueue().add(
          `retry-enroll-${existing.id}`,
          { enrollmentId: existing.id },
          { jobId: `retry-${existing.id}` } // prevent duplicate jobs
        );
        console.log(
          `[automation-engine] Re-enqueued stuck enrollment ${existing.id}`
        );
      } catch (err) {
        console.error(
          `[automation-engine] Failed to re-enqueue enrollment ${existing.id}:`,
          err
        );
      }
    }
    return existing;
  }

  const enrollment = await prisma.automationEnrollment.create({
    data: {
      contactId,
      automationId,
      status: "active",
      currentStep: 0,
    },
  });

  // Enqueue first step as a BullMQ job
  try {
    await getAutomationStepQueue().add(
      `enroll-${enrollment.id}`,
      { enrollmentId: enrollment.id }
    );
  } catch (err) {
    console.error(
      `[automation-engine] Failed to enqueue first step for enrollment ${enrollment.id}:`,
      err
    );
  }

  return enrollment;
}

/**
 * Dispatches a trigger to all matching automations.
 * Called from form submission, tag events, etc.
 */
export async function dispatchTrigger(
  type: TriggerConfig["type"],
  payload: { contactId: string; formId?: string; tagId?: string },
  workspaceId: string
) {
  const automations = await prisma.automation.findMany({
    where: {
      workspaceId,
      status: "active",
    },
    include: {
      steps: { orderBy: { order: "asc" }, take: 1 },
    },
  });

  let enrolled = 0;

  for (const automation of automations) {
    const trigger = automation.trigger as unknown as TriggerConfig;
    if (!trigger || trigger.type !== type) continue;

    // Match specific trigger conditions
    if (type === "form_submitted" && trigger.formId && trigger.formId !== payload.formId) continue;
    if (type === "tag_added" && trigger.tagId && trigger.tagId !== payload.tagId) continue;

    await enrollContact(automation.id, payload.contactId);
    enrolled++;
  }

  return { enrolled };
}

/**
 * Finds enrollments with overdue delayed steps and enqueues them.
 * Called by the cron route as a safety net (BullMQ delays handle most cases).
 */
export async function processDelayedSteps() {
  const now = new Date();

  const enrollments = await prisma.automationEnrollment.findMany({
    where: {
      status: "active",
      nextRunAt: { lte: now },
    },
    take: 100,
  });

  const queue = getAutomationStepQueue();
  let processed = 0;

  for (const enrollment of enrollments) {
    await queue.add(
      `delayed-recovery-${enrollment.id}`,
      { enrollmentId: enrollment.id }
    );

    // Clear nextRunAt so it's not re-enqueued
    await prisma.automationEnrollment.update({
      where: { id: enrollment.id },
      data: { nextRunAt: null },
    });

    processed++;
  }

  return { processed };
}
