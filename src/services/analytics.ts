"use server";

import { prisma } from "@/lib/prisma";
import { getWorkspaceId } from "@/lib/session";

export async function getDashboardMetrics() {
  const workspaceId = await getWorkspaceId();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalContacts,
    newContactsWeek,
    newContactsMonth,
    totalCampaigns,
    sentCampaigns,
    totalForms,
    totalEmailsSent,
    totalOpened,
    totalClicked,
    totalBounced,
    contactsBySource,
  ] = await Promise.all([
    prisma.contact.count({ where: { workspaceId } }),
    prisma.contact.count({ where: { workspaceId, createdAt: { gte: sevenDaysAgo } } }),
    prisma.contact.count({ where: { workspaceId, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.campaign.count({ where: { workspaceId } }),
    prisma.campaign.count({ where: { workspaceId, status: "sent" } }),
    prisma.form.count({ where: { workspaceId } }),
    prisma.emailLog.count({ where: { workspaceId, status: { not: "queued" } } }),
    prisma.emailLog.count({ where: { workspaceId, openedAt: { not: null } } }),
    prisma.emailLog.count({ where: { workspaceId, clickedAt: { not: null } } }),
    prisma.emailLog.count({ where: { workspaceId, status: "bounced" } }),
    prisma.contact.groupBy({
      by: ["source"],
      where: { workspaceId },
      _count: true,
    }),
  ]);

  const openRate = totalEmailsSent > 0 ? ((totalOpened / totalEmailsSent) * 100) : 0;
  const clickRate = totalEmailsSent > 0 ? ((totalClicked / totalEmailsSent) * 100) : 0;
  const bounceRate = totalEmailsSent > 0 ? ((totalBounced / totalEmailsSent) * 100) : 0;

  return {
    totalContacts,
    newContactsWeek,
    newContactsMonth,
    totalCampaigns,
    sentCampaigns,
    totalForms,
    totalEmailsSent,
    totalOpened,
    totalClicked,
    openRate: Math.round(openRate * 10) / 10,
    clickRate: Math.round(clickRate * 10) / 10,
    bounceRate: Math.round(bounceRate * 10) / 10,
    contactsBySource: contactsBySource.map((s) => ({
      source: s.source || "desconhecido",
      count: s._count,
    })),
  };
}

export async function getContactsOverTime(days = 30) {
  const workspaceId = await getWorkspaceId();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const contacts = await prisma.contact.findMany({
    where: { workspaceId, createdAt: { gte: startDate } },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const byDay: Record<string, number> = {};
  for (let i = 0; i <= days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split("T")[0];
    byDay[key] = 0;
  }

  for (const c of contacts) {
    const key = c.createdAt.toISOString().split("T")[0];
    if (byDay[key] !== undefined) byDay[key]++;
  }

  return Object.entries(byDay).map(([date, count]) => ({ date, count }));
}

export async function getCampaignMetrics(campaignId: string) {
  const logs = await prisma.emailLog.findMany({
    where: { campaignId },
  });

  const total = logs.length;
  const sent = logs.filter((l) => l.status !== "queued").length;
  const opened = logs.filter((l) => l.openedAt).length;
  const clicked = logs.filter((l) => l.clickedAt).length;
  const bounced = logs.filter((l) => l.status === "bounced").length;

  return {
    total,
    sent,
    opened,
    clicked,
    bounced,
    openRate: sent > 0 ? Math.round((opened / sent) * 1000) / 10 : 0,
    clickRate: sent > 0 ? Math.round((clicked / sent) * 1000) / 10 : 0,
    bounceRate: sent > 0 ? Math.round((bounced / sent) * 1000) / 10 : 0,
  };
}
