"use server";

import { prisma } from "@/lib/prisma";
import { getWorkspaceId } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function getTagsWithCount() {
  const workspaceId = await getWorkspaceId();
  const tags = await prisma.tag.findMany({
    where: { workspaceId },
    include: {
      _count: {
        select: { contacts: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return tags.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    contactCount: t._count.contacts,
    createdAt: t.createdAt,
  }));
}

export async function createTag(formData: FormData) {
  const workspaceId = await getWorkspaceId();

  const name = formData.get("name") as string;
  const color = (formData.get("color") as string) || null;

  if (!name?.trim()) return { error: "Nome e obrigatorio" };

  const existing = await prisma.tag.findFirst({
    where: { name: name.trim(), workspaceId },
  });

  if (existing) return { error: "Ja existe uma tag com este nome" };

  await prisma.tag.create({
    data: { name: name.trim(), color, workspaceId },
  });

  revalidatePath("/tags");
  return { success: true, error: null };
}

export async function updateTag(id: string, formData: FormData) {
  const workspaceId = await getWorkspaceId();

  const tag = await prisma.tag.findFirst({ where: { id, workspaceId } });
  if (!tag) return { error: "Tag nao encontrada" };

  const name = formData.get("name") as string;
  const color = (formData.get("color") as string) || null;

  if (!name?.trim()) return { error: "Nome e obrigatorio" };

  const duplicate = await prisma.tag.findFirst({
    where: { name: name.trim(), workspaceId, NOT: { id } },
  });

  if (duplicate) return { error: "Ja existe uma tag com este nome" };

  await prisma.tag.update({
    where: { id },
    data: { name: name.trim(), color },
  });

  revalidatePath("/tags");
  return { success: true, error: null };
}

export async function deleteTag(id: string) {
  const workspaceId = await getWorkspaceId();

  const tag = await prisma.tag.findFirst({ where: { id, workspaceId } });
  if (!tag) return { error: "Tag nao encontrada" };

  await prisma.tag.delete({ where: { id } });
  revalidatePath("/tags");
  revalidatePath("/contacts");
  return { success: true };
}
