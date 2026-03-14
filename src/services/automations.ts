"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getWorkspaceId } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const triggerSchema = z.object({
  type: z.enum(["form_submitted", "tag_added", "contact_created", "manual"]),
  formId: z.string().optional(),
  tagId: z.string().optional(),
});

const stepSchema = z.object({
  type: z.enum(["send_email", "delay", "add_tag", "remove_tag", "condition"]),
  config: z.record(z.string(), z.unknown()),
  order: z.number(),
});

export async function getAutomations() {
  const workspaceId = await getWorkspaceId();
  return prisma.automation.findMany({
    where: { workspaceId },
    include: {
      _count: { select: { enrollments: true, steps: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAutomation(id: string) {
  const workspaceId = await getWorkspaceId();
  return prisma.automation.findFirst({
    where: { id, workspaceId },
    include: {
      steps: { orderBy: { order: "asc" } },
      enrollments: {
        include: { contact: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      _count: {
        select: {
          enrollments: true,
        },
      },
    },
  });
}

export async function createAutomation(formData: FormData) {
  const workspaceId = await getWorkspaceId();

  const name = formData.get("name") as string;
  const triggerJson = formData.get("trigger") as string;
  const stepsJson = formData.get("steps") as string;

  if (!name?.trim()) return { error: "Nome e obrigatorio" };

  let trigger;
  try {
    trigger = triggerSchema.parse(JSON.parse(triggerJson));
  } catch {
    return { error: "Trigger invalido" };
  }

  let steps: z.infer<typeof stepSchema>[];
  try {
    steps = z.array(stepSchema).min(1, "Adicione pelo menos um passo").parse(JSON.parse(stepsJson));
  } catch {
    return { error: "Passos invalidos. Adicione pelo menos um passo." };
  }

  const automation = await prisma.automation.create({
    data: {
      name,
      trigger: trigger as unknown as Prisma.InputJsonValue,
      workspaceId,
      steps: {
        create: steps.map((s, i) => ({
          type: s.type,
          config: s.config as unknown as Prisma.InputJsonValue,
          order: i,
        })),
      },
    },
  });

  revalidatePath("/automations");
  return { success: true, automationId: automation.id, error: null };
}

export async function updateAutomation(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const triggerJson = formData.get("trigger") as string;
  const stepsJson = formData.get("steps") as string;

  if (!name?.trim()) return { error: "Nome e obrigatorio" };

  let trigger;
  try {
    trigger = triggerSchema.parse(JSON.parse(triggerJson));
  } catch {
    return { error: "Trigger invalido" };
  }

  let steps: z.infer<typeof stepSchema>[];
  try {
    steps = z.array(stepSchema).min(1).parse(JSON.parse(stepsJson));
  } catch {
    return { error: "Passos invalidos" };
  }

  // Delete existing steps and recreate
  await prisma.automationStep.deleteMany({ where: { automationId: id } });

  await prisma.automation.update({
    where: { id },
    data: {
      name,
      trigger: trigger as unknown as Prisma.InputJsonValue,
      steps: {
        create: steps.map((s, i) => ({
          type: s.type,
          config: s.config as unknown as Prisma.InputJsonValue,
          order: i,
        })),
      },
    },
  });

  revalidatePath("/automations");
  revalidatePath(`/automations/${id}`);
  return { success: true, error: null };
}

export async function deleteAutomation(id: string) {
  await prisma.automation.delete({ where: { id } });
  revalidatePath("/automations");
  return { success: true };
}

export async function toggleAutomationStatus(id: string) {
  const automation = await prisma.automation.findUnique({ where: { id } });
  if (!automation) return { error: "Automacao nao encontrada" };

  const newStatus = automation.status === "active" ? "inactive" : "active";

  await prisma.automation.update({
    where: { id },
    data: { status: newStatus },
  });

  revalidatePath("/automations");
  revalidatePath(`/automations/${id}`);
  return { success: true, status: newStatus };
}

export async function saveFlowData(
  id: string,
  flowData: { nodes: unknown[]; edges: unknown[] },
  trigger: { type: string; formId?: string; tagId?: string },
  steps: { type: string; config: Record<string, unknown>; order: number }[]
) {
  // Delete existing steps and recreate
  await prisma.automationStep.deleteMany({ where: { automationId: id } });

  await prisma.automation.update({
    where: { id },
    data: {
      flowData: flowData as unknown as Prisma.InputJsonValue,
      trigger: trigger as unknown as Prisma.InputJsonValue,
      steps: {
        create: steps.map((s, i) => ({
          type: s.type,
          config: s.config as unknown as Prisma.InputJsonValue,
          order: i,
        })),
      },
    },
  });

  revalidatePath("/automations");
  revalidatePath(`/automations/${id}`);
  return { success: true, error: undefined as string | undefined };
}

export async function createAutomationWithFlow(
  name: string,
  flowData: { nodes: unknown[]; edges: unknown[] },
  trigger: { type: string; formId?: string; tagId?: string },
  steps: { type: string; config: Record<string, unknown>; order: number }[]
) {
  const workspaceId = await getWorkspaceId();

  if (!name?.trim()) return { error: "Nome e obrigatorio" };

  const automation = await prisma.automation.create({
    data: {
      name,
      trigger: trigger as unknown as Prisma.InputJsonValue,
      flowData: flowData as unknown as Prisma.InputJsonValue,
      workspaceId,
      steps: {
        create: steps.map((s, i) => ({
          type: s.type,
          config: s.config as unknown as Prisma.InputJsonValue,
          order: i,
        })),
      },
    },
  });

  revalidatePath("/automations");
  return { success: true, automationId: automation.id, error: null };
}

export async function getAutomationStats(id: string) {
  const [active, completed, failed] = await Promise.all([
    prisma.automationEnrollment.count({ where: { automationId: id, status: "active" } }),
    prisma.automationEnrollment.count({ where: { automationId: id, status: "completed" } }),
    prisma.automationEnrollment.count({ where: { automationId: id, status: "failed" } }),
  ]);

  return { active, completed, failed, total: active + completed + failed };
}
