"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getWorkspaceId } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// --- Rule types ---
export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "gt"
  | "lt"
  | "after"
  | "before";

export type ConditionField =
  | "tag"
  | "email"
  | "firstName"
  | "lastName"
  | "source"
  | "createdAt"
  | "unsubscribed";

export interface SegmentCondition {
  field: ConditionField;
  op: ConditionOperator;
  value: string;
}

export interface SegmentRules {
  operator: "AND" | "OR";
  conditions: SegmentCondition[];
}

const conditionSchema = z.object({
  field: z.enum(["tag", "email", "firstName", "lastName", "source", "createdAt", "unsubscribed"]),
  op: z.enum(["equals", "not_equals", "contains", "not_contains", "gt", "lt", "after", "before"]),
  value: z.string(),
});

const rulesSchema = z.object({
  operator: z.enum(["AND", "OR"]),
  conditions: z.array(conditionSchema).min(1, "Adicione pelo menos uma condicao"),
});

// --- CRUD ---
export async function getSegments() {
  const workspaceId = await getWorkspaceId();
  return prisma.segment.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSegment(id: string) {
  const workspaceId = await getWorkspaceId();
  return prisma.segment.findFirst({
    where: { id, workspaceId },
  });
}

export async function createSegment(formData: FormData) {
  const workspaceId = await getWorkspaceId();

  const name = formData.get("name") as string;
  const rulesJson = formData.get("rules") as string;

  if (!name?.trim()) return { error: "Nome e obrigatorio" };

  let rules: SegmentRules;
  try {
    rules = rulesSchema.parse(JSON.parse(rulesJson));
  } catch {
    return { error: "Regras invalidas" };
  }

  const segment = await prisma.segment.create({
    data: { name, rules: rules as unknown as Prisma.InputJsonValue, workspaceId },
  });

  revalidatePath("/segments");
  return { success: true, segmentId: segment.id, error: null };
}

export async function updateSegment(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const rulesJson = formData.get("rules") as string;

  if (!name?.trim()) return { error: "Nome e obrigatorio" };

  let rules: SegmentRules;
  try {
    rules = rulesSchema.parse(JSON.parse(rulesJson));
  } catch {
    return { error: "Regras invalidas" };
  }

  await prisma.segment.update({
    where: { id },
    data: { name, rules: rules as unknown as Prisma.InputJsonValue },
  });

  revalidatePath("/segments");
  revalidatePath(`/segments/${id}`);
  return { success: true, error: null };
}

export async function deleteSegment(id: string) {
  await prisma.segment.delete({ where: { id } });
  revalidatePath("/segments");
  return { success: true };
}

// --- Evaluation engine ---
export async function evaluateSegment(segmentId: string) {
  const workspaceId = await getWorkspaceId();
  const segment = await prisma.segment.findFirst({
    where: { id: segmentId, workspaceId },
  });

  if (!segment) return [];

  const rules = segment.rules as unknown as SegmentRules;
  return evaluateRules(rules, workspaceId);
}

export async function evaluateRules(rules: SegmentRules, workspaceId: string) {
  const conditions = rules.conditions.map((c) => buildWhereCondition(c));

  const where: Prisma.ContactWhereInput = {
    workspaceId,
    ...(rules.operator === "AND" ? { AND: conditions } : { OR: conditions }),
  };

  return prisma.contact.findMany({
    where,
    include: { tags: { include: { tag: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSegmentCount(segmentId: string) {
  const workspaceId = await getWorkspaceId();
  const segment = await prisma.segment.findFirst({
    where: { id: segmentId, workspaceId },
  });

  if (!segment) return 0;

  const rules = segment.rules as unknown as SegmentRules;
  const conditions = rules.conditions.map((c) => buildWhereCondition(c));

  const where: Prisma.ContactWhereInput = {
    workspaceId,
    ...(rules.operator === "AND" ? { AND: conditions } : { OR: conditions }),
  };

  return prisma.contact.count({ where });
}

export async function previewSegmentCount(rulesJson: string) {
  const workspaceId = await getWorkspaceId();

  let rules: SegmentRules;
  try {
    rules = rulesSchema.parse(JSON.parse(rulesJson));
  } catch {
    return 0;
  }

  const conditions = rules.conditions.map((c) => buildWhereCondition(c));

  const where: Prisma.ContactWhereInput = {
    workspaceId,
    ...(rules.operator === "AND" ? { AND: conditions } : { OR: conditions }),
  };

  return prisma.contact.count({ where });
}

function buildWhereCondition(condition: SegmentCondition): Prisma.ContactWhereInput {
  const { field, op, value } = condition;

  switch (field) {
    case "tag":
      if (op === "contains") {
        return { tags: { some: { tag: { name: { contains: value, mode: "insensitive" } } } } };
      }
      return { tags: { none: { tag: { name: { contains: value, mode: "insensitive" } } } } };

    case "email":
    case "firstName":
    case "lastName":
      return buildStringCondition(field, op, value);

    case "source":
      if (op === "equals") return { source: value };
      if (op === "not_equals") return { NOT: { source: value } };
      return { source: { contains: value, mode: "insensitive" } };

    case "createdAt":
      if (op === "after" || op === "gt") return { createdAt: { gt: new Date(value) } };
      if (op === "before" || op === "lt") return { createdAt: { lt: new Date(value) } };
      return {};

    case "unsubscribed":
      return { unsubscribed: value === "true" };

    default:
      return {};
  }
}

function buildStringCondition(
  field: "email" | "firstName" | "lastName",
  op: ConditionOperator,
  value: string
): Prisma.ContactWhereInput {
  switch (op) {
    case "equals":
      return { [field]: value };
    case "not_equals":
      return { NOT: { [field]: value } };
    case "contains":
      return { [field]: { contains: value, mode: "insensitive" } };
    case "not_contains":
      return { NOT: { [field]: { contains: value, mode: "insensitive" } } };
    default:
      return {};
  }
}
