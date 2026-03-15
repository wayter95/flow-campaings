import { Worker, Job } from "bullmq";
import { getWorkerConnectionOptions, QUEUE_PREFIX } from "@/lib/queue/connection";
import {
  QUEUE_NAMES,
  type AutomationStepJobData,
} from "@/lib/queue/queues";
import { getAutomationStepQueue } from "@/lib/queue/queues";
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

/* ─── Step config types ─── */

interface SendEmailConfig {
  subject: string;
  htmlContent: string;
  templateId?: string;
}

interface SendWhatsAppConfig {
  message: string;
}

interface DelayConfig {
  duration: number;
  unit: "minutes" | "hours" | "days";
}

interface TagConfig {
  tagId: string;
}

interface ConditionConfig {
  field: string;
  op: string;
  value: string;
  trueStep: number;
  falseStep: number;
}

type StepConfig =
  | SendEmailConfig
  | SendWhatsAppConfig
  | DelayConfig
  | TagConfig
  | ConditionConfig;

/* ─── Helpers ─── */

async function enqueueNextStep(enrollmentId: string, nextStep: number, totalSteps: number) {
  if (nextStep >= totalSteps) {
    await prisma.automationEnrollment.update({
      where: { id: enrollmentId },
      data: { status: "completed", currentStep: nextStep },
    });
  } else {
    await prisma.automationEnrollment.update({
      where: { id: enrollmentId },
      data: { currentStep: nextStep, nextRunAt: null },
    });
    // Enqueue next step as a new job (no recursion!)
    await getAutomationStepQueue().add(
      `step-${enrollmentId}-${nextStep}`,
      { enrollmentId },
      { delay: 100 } // tiny delay to avoid tight loops
    );
  }
}

function evaluateCondition(
  config: ConditionConfig,
  contact: {
    tags: { tag: { name: string; id: string } }[];
    email: string;
    firstName: string | null;
    lastName: string | null;
    source: string | null;
    unsubscribed: boolean;
  }
): boolean {
  const { field, op, value } = config;

  switch (field) {
    case "tag": {
      const hasTag = contact.tags.some((ct) =>
        ct.tag.name.toLowerCase().includes(value.toLowerCase())
      );
      if (op === "contains") return hasTag;
      if (op === "not_contains") return !hasTag;
      return false;
    }
    case "email": {
      if (op === "contains")
        return contact.email.toLowerCase().includes(value.toLowerCase());
      if (op === "not_contains")
        return !contact.email.toLowerCase().includes(value.toLowerCase());
      if (op === "equals")
        return contact.email.toLowerCase() === value.toLowerCase();
      return false;
    }
    case "unsubscribed":
      return contact.unsubscribed === (value === "true");
    default:
      return false;
  }
}

/* ─── Main processor ─── */

async function processAutomationStepJob(job: Job<AutomationStepJobData>) {
  const { enrollmentId } = job.data;

  const enrollment = await prisma.automationEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      automation: { include: { steps: { orderBy: { order: "asc" } } } },
      contact: { include: { tags: { include: { tag: true } } } },
    },
  });

  if (!enrollment || enrollment.status !== "active") {
    return { status: "skipped", reason: "not_active" };
  }

  const { automation, contact } = enrollment;
  const steps = automation.steps;

  if (enrollment.currentStep >= steps.length) {
    await prisma.automationEnrollment.update({
      where: { id: enrollmentId },
      data: { status: "completed" },
    });
    return { status: "completed" };
  }

  const step = steps[enrollment.currentStep];
  const config = step.config as unknown as StepConfig;

  switch (step.type) {
    case "send_email": {
      if (contact.unsubscribed) {
        await enqueueNextStep(enrollmentId, enrollment.currentStep + 1, steps.length);
        return { status: "skipped", reason: "unsubscribed" };
      }

      const emailConfig = config as SendEmailConfig;
      let subject = emailConfig.subject;
      let html = emailConfig.htmlContent;

      if (emailConfig.templateId) {
        const template = await prisma.emailTemplate.findUnique({
          where: { id: emailConfig.templateId },
        });
        if (template) {
          subject = template.subject;
          html = template.htmlContent;
        }
      }

      const unsubscribeUrl = generateUnsubscribeUrl(contact.id, automation.workspaceId);

      if (!html.includes("{{unsubscribeUrl}}")) {
        html = html + UNSUBSCRIBE_FOOTER;
      }

      subject = replaceVariables(subject, contact, { unsubscribeUrl });
      html = replaceVariables(html, contact, { unsubscribeUrl });

      await sendEmail({
        to: contact.email,
        subject,
        html,
        workspaceId: automation.workspaceId,
      });

      await logActivity({
        type: "email_sent",
        contactId: contact.id,
        workspaceId: automation.workspaceId,
        metadata: { automationId: automation.id, automationName: automation.name },
      });

      await enqueueNextStep(enrollmentId, enrollment.currentStep + 1, steps.length);
      return { status: "sent", type: "email" };
    }

    case "send_whatsapp": {
      const whatsappConfig = config as SendWhatsAppConfig;

      if (!contact.phone) {
        await enqueueNextStep(enrollmentId, enrollment.currentStep + 1, steps.length);
        return { status: "skipped", reason: "no_phone" };
      }

      const personalizedMessage = replaceVariables(whatsappConfig.message, contact);

      await sendWhatsApp({
        to: contact.phone,
        message: personalizedMessage,
        workspaceId: automation.workspaceId,
      });

      await logActivity({
        type: "whatsapp_sent",
        contactId: contact.id,
        workspaceId: automation.workspaceId,
        metadata: { automationId: automation.id, automationName: automation.name },
      });

      await enqueueNextStep(enrollmentId, enrollment.currentStep + 1, steps.length);
      return { status: "sent", type: "whatsapp" };
    }

    case "delay": {
      const delayConfig = config as DelayConfig;
      let delayMs: number;

      switch (delayConfig.unit) {
        case "minutes":
          delayMs = delayConfig.duration * 60 * 1000;
          break;
        case "hours":
          delayMs = delayConfig.duration * 60 * 60 * 1000;
          break;
        case "days":
          delayMs = delayConfig.duration * 24 * 60 * 60 * 1000;
          break;
      }

      const nextRunAt = new Date(Date.now() + delayMs);

      await prisma.automationEnrollment.update({
        where: { id: enrollmentId },
        data: {
          currentStep: enrollment.currentStep + 1,
          nextRunAt,
        },
      });

      // Enqueue next step with native BullMQ delay (replaces cron polling!)
      await getAutomationStepQueue().add(
        `delayed-${enrollmentId}-${enrollment.currentStep + 1}`,
        { enrollmentId },
        { delay: delayMs }
      );

      return { status: "delayed", delayMs };
    }

    case "add_tag": {
      const tagConfig = config as TagConfig;
      const existingTag = await prisma.contactTag.findFirst({
        where: { contactId: contact.id, tagId: tagConfig.tagId },
      });

      if (!existingTag) {
        await prisma.contactTag.create({
          data: { contactId: contact.id, tagId: tagConfig.tagId },
        });
        await logActivity({
          type: "tag_added",
          contactId: contact.id,
          workspaceId: automation.workspaceId,
          metadata: { tagId: tagConfig.tagId, automationId: automation.id },
        });
      }

      await enqueueNextStep(enrollmentId, enrollment.currentStep + 1, steps.length);
      return { status: "done", type: "add_tag" };
    }

    case "remove_tag": {
      const tagConfig = config as TagConfig;
      const contactTag = await prisma.contactTag.findFirst({
        where: { contactId: contact.id, tagId: tagConfig.tagId },
      });

      if (contactTag) {
        await prisma.contactTag.delete({ where: { id: contactTag.id } });
        await logActivity({
          type: "tag_removed",
          contactId: contact.id,
          workspaceId: automation.workspaceId,
          metadata: { tagId: tagConfig.tagId, automationId: automation.id },
        });
      }

      await enqueueNextStep(enrollmentId, enrollment.currentStep + 1, steps.length);
      return { status: "done", type: "remove_tag" };
    }

    case "condition": {
      const condConfig = config as ConditionConfig;
      const matches = evaluateCondition(condConfig, contact);
      const nextStep = matches ? condConfig.trueStep : condConfig.falseStep;

      await enqueueNextStep(enrollmentId, nextStep, steps.length);
      return { status: "done", type: "condition", matches };
    }
  }

  return { status: "unknown_step_type" };
}

/* ─── Worker factory ─── */

export function createAutomationStepWorker() {
  const worker = new Worker<AutomationStepJobData>(
    QUEUE_NAMES.AUTOMATION_STEP,
    processAutomationStepJob,
    {
      connection: getWorkerConnectionOptions(),
      prefix: QUEUE_PREFIX,
      concurrency: 3,
    }
  );

  worker.on("completed", (job) => {
    if (job) {
      console.log(`[automation-step] Job ${job.id} completed`);
    }
  });

  worker.on("failed", (job, err) => {
    if (job) {
      console.error(
        `[automation-step] Job ${job.id} failed (attempt ${job.attemptsMade}):`,
        err.message
      );

      // If max retries exhausted, mark enrollment as failed
      if (job.attemptsMade >= (job.opts.attempts || 3)) {
        prisma.automationEnrollment
          .update({
            where: { id: job.data.enrollmentId },
            data: { status: "failed" },
          })
          .catch(console.error);
      }
    }
  });

  worker.on("error", (err) => {
    console.error("[automation-step] Worker error:", err);
  });

  return worker;
}
