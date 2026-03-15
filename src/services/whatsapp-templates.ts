"use server";

import { prisma } from "@/lib/prisma";
import { getWorkspaceId } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function getWhatsAppTemplates() {
  const workspaceId = await getWorkspaceId();
  return prisma.whatsAppTemplate.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getWhatsAppTemplate(id: string) {
  const workspaceId = await getWorkspaceId();
  return prisma.whatsAppTemplate.findFirst({
    where: { id, workspaceId },
  });
}

export async function createWhatsAppTemplate(formData: FormData) {
  const workspaceId = await getWorkspaceId();

  const name = formData.get("name") as string;
  const message = formData.get("message") as string;

  if (!name?.trim()) return { error: "Nome e obrigatorio" };
  if (!message?.trim()) return { error: "Mensagem e obrigatoria" };

  const template = await prisma.whatsAppTemplate.create({
    data: { name, message, workspaceId },
  });

  revalidatePath("/templates/whatsapp");
  return { success: true, templateId: template.id, error: null };
}

export async function updateWhatsAppTemplate(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const message = formData.get("message") as string;

  if (!name?.trim()) return { error: "Nome e obrigatorio" };
  if (!message?.trim()) return { error: "Mensagem e obrigatoria" };

  await prisma.whatsAppTemplate.update({
    where: { id },
    data: { name, message },
  });

  revalidatePath("/templates/whatsapp");
  revalidatePath(`/templates/whatsapp/${id}`);
  return { success: true, error: null };
}

export async function deleteWhatsAppTemplate(id: string) {
  await prisma.whatsAppTemplate.delete({ where: { id } });
  revalidatePath("/templates/whatsapp");
  return { success: true };
}
