"use server";

import { prisma } from "@/lib/prisma";
import { getWorkspaceId } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logActivity } from "@/services/activities";
import { dispatchTrigger } from "@/services/automation-triggers";

const contactSchema = z.object({
  email: z.string().email("Email invalido"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  source: z.string().optional(),
});

export async function getContacts(params?: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const workspaceId = await getWorkspaceId();
  const page = params?.page || 1;
  const limit = params?.limit || 20;
  const skip = (page - 1) * limit;

  const where = {
    workspaceId,
    ...(params?.search
      ? {
          OR: [
            { email: { contains: params.search, mode: "insensitive" as const } },
            { firstName: { contains: params.search, mode: "insensitive" as const } },
            { lastName: { contains: params.search, mode: "insensitive" as const } },
            { phone: { contains: params.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: { tags: { include: { tag: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.contact.count({ where }),
  ]);

  return { contacts, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getContact(id: string) {
  const workspaceId = await getWorkspaceId();
  return prisma.contact.findFirst({
    where: { id, workspaceId },
    include: {
      tags: { include: { tag: true } },
      emailLogs: {
        include: { campaign: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
}

export async function createContact(formData: FormData) {
  const workspaceId = await getWorkspaceId();

  const raw = {
    email: formData.get("email") as string,
    firstName: (formData.get("firstName") as string) || undefined,
    lastName: (formData.get("lastName") as string) || undefined,
    phone: (formData.get("phone") as string) || undefined,
    source: "manual",
  };

  const result = contactSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const existing = await prisma.contact.findFirst({
    where: { email: result.data.email, workspaceId },
  });

  if (existing) {
    return { error: "Contato com este email ja existe" };
  }

  const contact = await prisma.contact.create({
    data: { ...result.data, workspaceId },
  });

  await logActivity({ type: "contact_created", contactId: contact.id, workspaceId });
  await dispatchTrigger("contact_created", { contactId: contact.id }, workspaceId);

  revalidatePath("/contacts");
  return { success: true };
}

export async function updateContact(id: string, formData: FormData) {
  const workspaceId = await getWorkspaceId();

  const data = {
    firstName: (formData.get("firstName") as string) || null,
    lastName: (formData.get("lastName") as string) || null,
    phone: (formData.get("phone") as string) || null,
  };

  await prisma.contact.update({
    where: { id },
    data,
  });

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  return { success: true };
}

export async function deleteContact(id: string) {
  const workspaceId = await getWorkspaceId();

  await prisma.contact.delete({
    where: { id },
  });

  revalidatePath("/contacts");
  return { success: true };
}

export async function addTagToContact(contactId: string, tagName: string) {
  const workspaceId = await getWorkspaceId();

  const tag = await prisma.tag.upsert({
    where: { name_workspaceId: { name: tagName, workspaceId } },
    create: { name: tagName, workspaceId },
    update: {},
  });

  await prisma.contactTag.upsert({
    where: { contactId_tagId: { contactId, tagId: tag.id } },
    create: { contactId, tagId: tag.id },
    update: {},
  });

  await logActivity({ type: "tag_added", contactId, workspaceId, metadata: { tagName } });
  await dispatchTrigger("tag_added", { contactId, tagId: tag.id }, workspaceId);

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}

export async function removeTagFromContact(contactId: string, tagId: string) {
  const workspaceId = await getWorkspaceId();

  const tag = await prisma.tag.findUnique({ where: { id: tagId } });

  await prisma.contactTag.deleteMany({
    where: { contactId, tagId },
  });

  await logActivity({ type: "tag_removed", contactId, workspaceId, metadata: { tagName: tag?.name } });

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}

export async function getTags() {
  const workspaceId = await getWorkspaceId();
  return prisma.tag.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
  });
}
