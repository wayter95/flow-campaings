"use server";

import { prisma } from "@/lib/prisma";
import { getWorkspaceId } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/services/activities";

interface ImportRow {
  email: string;
  firstName?: string;
  lastName?: string;
  source?: string;
  tags?: string;
}

interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export async function importContacts(
  rows: ImportRow[],
  duplicateAction: "skip" | "update"
): Promise<ImportResult> {
  const workspaceId = await getWorkspaceId();

  const result: ImportResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (const row of rows) {
    if (!row.email?.trim()) {
      result.skipped++;
      continue;
    }

    const email = row.email.trim().toLowerCase();

    try {
      const existing = await prisma.contact.findFirst({
        where: { email, workspaceId },
      });

      if (existing) {
        if (duplicateAction === "skip") {
          result.skipped++;
          continue;
        }

        // Update existing contact
        await prisma.contact.update({
          where: { id: existing.id },
          data: {
            ...(row.firstName ? { firstName: row.firstName.trim() } : {}),
            ...(row.lastName ? { lastName: row.lastName.trim() } : {}),
            ...(row.source ? { source: row.source.trim() } : {}),
          },
        });

        if (row.tags) {
          await processTags(existing.id, workspaceId, row.tags);
        }

        result.updated++;
      } else {
        // Create new contact
        const contact = await prisma.contact.create({
          data: {
            email,
            firstName: row.firstName?.trim() || null,
            lastName: row.lastName?.trim() || null,
            source: row.source?.trim() || "csv_import",
            workspaceId,
          },
        });

        if (row.tags) {
          await processTags(contact.id, workspaceId, row.tags);
        }

        await logActivity({
          type: "contact_created",
          contactId: contact.id,
          workspaceId,
          metadata: { source: "csv_import" },
        });

        result.created++;
      }
    } catch (err) {
      result.errors.push(`Erro ao importar ${email}: ${String(err)}`);
    }
  }

  revalidatePath("/contacts");
  return result;
}

async function processTags(contactId: string, workspaceId: string, tagsStr: string) {
  const tagNames = tagsStr
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  for (const tagName of tagNames) {
    let tag = await prisma.tag.findFirst({
      where: { name: tagName, workspaceId },
    });

    if (!tag) {
      tag = await prisma.tag.create({
        data: { name: tagName, workspaceId },
      });
    }

    const existingRelation = await prisma.contactTag.findFirst({
      where: { contactId, tagId: tag.id },
    });

    if (!existingRelation) {
      await prisma.contactTag.create({
        data: { contactId, tagId: tag.id },
      });
    }
  }
}
