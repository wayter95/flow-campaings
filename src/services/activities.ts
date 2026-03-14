"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

type ActivityType =
  | "email_sent"
  | "email_opened"
  | "email_clicked"
  | "email_bounced"
  | "form_submitted"
  | "tag_added"
  | "tag_removed"
  | "contact_created"
  | "unsubscribed";

export async function logActivity({
  type,
  contactId,
  workspaceId,
  metadata,
}: {
  type: ActivityType;
  contactId: string;
  workspaceId: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.activityLog.create({
    data: {
      type,
      contactId,
      workspaceId,
      metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
    },
  });
}

export async function getContactActivities(contactId: string, limit = 20) {
  return prisma.activityLog.findMany({
    where: { contactId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getRecentActivities(workspaceId: string, limit = 20) {
  return prisma.activityLog.findMany({
    where: { workspaceId },
    include: { contact: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

