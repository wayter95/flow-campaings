"use server";

import { prisma } from "@/lib/prisma";
import { getWorkspaceId } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function getEmailTemplates() {
  const workspaceId = await getWorkspaceId();
  return prisma.emailTemplate.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getEmailTemplate(id: string) {
  const workspaceId = await getWorkspaceId();
  return prisma.emailTemplate.findFirst({
    where: { id, workspaceId },
  });
}

export async function createEmailTemplate(formData: FormData) {
  const workspaceId = await getWorkspaceId();

  const name = formData.get("name") as string;
  const subject = formData.get("subject") as string;
  const htmlContent = formData.get("htmlContent") as string;

  if (!name?.trim()) return { error: "Nome e obrigatorio" };
  if (!subject?.trim()) return { error: "Assunto e obrigatorio" };

  const template = await prisma.emailTemplate.create({
    data: { name, subject, htmlContent: htmlContent || "", workspaceId },
  });

  revalidatePath("/templates");
  return { success: true, templateId: template.id, error: null };
}

export async function updateEmailTemplate(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  const subject = formData.get("subject") as string;
  const htmlContent = formData.get("htmlContent") as string;

  if (!name?.trim()) return { error: "Nome e obrigatorio" };
  if (!subject?.trim()) return { error: "Assunto e obrigatorio" };

  await prisma.emailTemplate.update({
    where: { id },
    data: { name, subject, htmlContent: htmlContent || "" },
  });

  revalidatePath("/templates");
  revalidatePath(`/templates/${id}`);
  return { success: true, error: null };
}

export async function deleteEmailTemplate(id: string) {
  await prisma.emailTemplate.delete({ where: { id } });
  revalidatePath("/templates");
  return { success: true };
}
