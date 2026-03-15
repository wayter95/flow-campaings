"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { sendEmail } from "@/lib/sendgrid";
import { sendWhatsApp } from "@/lib/evolution";
import { logActivity } from "@/services/activities";
import { replaceVariables } from "@/lib/replace-variables";

interface TriggerConfig {
  type: "form_submitted" | "tag_added" | "contact_created" | "manual";
  formId?: string;
  tagId?: string;
}

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

type StepConfig = SendEmailConfig | SendWhatsAppConfig | DelayConfig | TagConfig | ConditionConfig;

export async function enrollContact(automationId: string, contactId: string) {
  const existing = await prisma.automationEnrollment.findUnique({
    where: { contactId_automationId: { contactId, automationId } },
  });

  if (existing) return existing;

  const enrollment = await prisma.automationEnrollment.create({
    data: {
      contactId,
      automationId,
      status: "active",
      currentStep: 0,
    },
  });

  // Start processing immediately
  await processStep(enrollment.id);

  return enrollment;
}

export async function processStep(enrollmentId: string) {
  const enrollment = await prisma.automationEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      automation: { include: { steps: { orderBy: { order: "asc" } } } },
      contact: { include: { tags: { include: { tag: true } } } },
    },
  });

  if (!enrollment || enrollment.status !== "active") return;

  const { automation, contact } = enrollment;
  const steps = automation.steps;

  if (enrollment.currentStep >= steps.length) {
    await prisma.automationEnrollment.update({
      where: { id: enrollmentId },
      data: { status: "completed" },
    });
    return;
  }

  const step = steps[enrollment.currentStep];
  const config = step.config as unknown as StepConfig;

  switch (step.type) {
    case "send_email": {
      const emailConfig = config as SendEmailConfig;
      let subject = emailConfig.subject;
      let html = emailConfig.htmlContent;

      // If using a template, fetch it
      if (emailConfig.templateId) {
        const template = await prisma.emailTemplate.findUnique({
          where: { id: emailConfig.templateId },
        });
        if (template) {
          subject = template.subject;
          html = template.htmlContent;
        }
      }

      subject = replaceVariables(subject, contact);
      html = replaceVariables(html, contact);

      try {
        await sendEmail({ to: contact.email, subject, html, workspaceId: automation.workspaceId });
        await logActivity({
          type: "email_sent",
          contactId: contact.id,
          workspaceId: automation.workspaceId,
          metadata: { automationId: automation.id, automationName: automation.name },
        });
      } catch {
        await prisma.automationEnrollment.update({
          where: { id: enrollmentId },
          data: { status: "failed" },
        });
        return;
      }

      await advanceStep(enrollmentId, enrollment.currentStep + 1, steps.length);
      break;
    }

    case "send_whatsapp": {
      const whatsappConfig = config as SendWhatsAppConfig;
      const phone = contact.phone;

      if (!phone) {
        console.warn(`Contato ${contact.id} não tem número de telefone. Pulando envio WhatsApp.`);
        await advanceStep(enrollmentId, enrollment.currentStep + 1, steps.length);
        break;
      }

      const personalizedMessage = replaceVariables(whatsappConfig.message, contact);

      try {
        await sendWhatsApp({
          to: phone,
          message: personalizedMessage,
          workspaceId: automation.workspaceId,
        });
        await logActivity({
          type: "whatsapp_sent",
          contactId: contact.id,
          workspaceId: automation.workspaceId,
          metadata: { automationId: automation.id, automationName: automation.name },
        });
      } catch {
        await prisma.automationEnrollment.update({
          where: { id: enrollmentId },
          data: { status: "failed" },
        });
        return;
      }

      await advanceStep(enrollmentId, enrollment.currentStep + 1, steps.length);
      break;
    }

    case "delay": {
      const delayConfig = config as DelayConfig;
      const now = new Date();
      let nextRunAt: Date;

      switch (delayConfig.unit) {
        case "minutes":
          nextRunAt = new Date(now.getTime() + delayConfig.duration * 60 * 1000);
          break;
        case "hours":
          nextRunAt = new Date(now.getTime() + delayConfig.duration * 60 * 60 * 1000);
          break;
        case "days":
          nextRunAt = new Date(now.getTime() + delayConfig.duration * 24 * 60 * 60 * 1000);
          break;
      }

      await prisma.automationEnrollment.update({
        where: { id: enrollmentId },
        data: {
          currentStep: enrollment.currentStep + 1,
          nextRunAt,
        },
      });
      break;
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

      await advanceStep(enrollmentId, enrollment.currentStep + 1, steps.length);
      break;
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

      await advanceStep(enrollmentId, enrollment.currentStep + 1, steps.length);
      break;
    }

    case "condition": {
      const condConfig = config as ConditionConfig;
      const matches = evaluateCondition(condConfig, contact);
      const nextStep = matches ? condConfig.trueStep : condConfig.falseStep;

      await advanceStep(enrollmentId, nextStep, steps.length);
      break;
    }
  }
}

async function advanceStep(enrollmentId: string, nextStep: number, totalSteps: number) {
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
    // Continue processing next step immediately
    await processStep(enrollmentId);
  }
}

function evaluateCondition(
  config: ConditionConfig,
  contact: { tags: { tag: { name: string; id: string } }[]; email: string; firstName: string | null; lastName: string | null; source: string | null; unsubscribed: boolean }
): boolean {
  const { field, op, value } = config;

  switch (field) {
    case "tag": {
      const hasTag = contact.tags.some((ct) =>
        ct.tag.name.toLowerCase().includes(value.toLowerCase())
      );
      return op === "contains" ? hasTag : !hasTag;
    }
    case "email": {
      if (op === "contains") return contact.email.toLowerCase().includes(value.toLowerCase());
      if (op === "equals") return contact.email.toLowerCase() === value.toLowerCase();
      return false;
    }
    case "unsubscribed":
      return contact.unsubscribed === (value === "true");
    default:
      return false;
  }
}

export async function processDelayedSteps() {
  const now = new Date();

  const enrollments = await prisma.automationEnrollment.findMany({
    where: {
      status: "active",
      nextRunAt: { lte: now },
    },
    take: 100,
  });

  let processed = 0;
  for (const enrollment of enrollments) {
    await processStep(enrollment.id);
    processed++;
  }

  return { processed };
}
