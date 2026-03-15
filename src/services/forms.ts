"use server";

import { prisma } from "@/lib/prisma";
import { getWorkspaceId } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { logActivity } from "@/services/activities";
import { dispatchTrigger } from "@/services/automation-triggers";

const formSchema = z.object({
  name: z.string().min(1, "Nome e obrigatorio"),
  description: z.string().optional(),
});

const fieldSchema = z.object({
  label: z.string().min(1),
  type: z.enum(["text", "email", "number", "select", "textarea"]),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
});

export async function getForms() {
  const workspaceId = await getWorkspaceId();
  return prisma.form.findMany({
    where: { workspaceId },
    include: {
      fields: { orderBy: { order: "asc" } },
      _count: { select: { submissions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getForm(id: string) {
  const workspaceId = await getWorkspaceId();
  return prisma.form.findFirst({
    where: { id, workspaceId },
    include: {
      fields: { orderBy: { order: "asc" } },
      submissions: {
        include: { contact: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });
}

export async function createForm(formData: FormData) {
  const workspaceId = await getWorkspaceId();

  const raw = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
  };

  const result = formSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const fieldsJson = formData.get("fields") as string;
  let fields: z.infer<typeof fieldSchema>[] = [];

  if (fieldsJson) {
    try {
      const parsed = JSON.parse(fieldsJson);
      fields = z.array(fieldSchema).parse(parsed);
    } catch {
      return { error: "Campos invalidos" };
    }
  }

  const form = await prisma.form.create({
    data: {
      ...result.data,
      workspaceId,
      fields: {
        create: fields.map((field, index) => ({
          label: field.label,
          type: field.type,
          required: field.required,
          options: field.options ? field.options : Prisma.JsonNull,
          order: index,
        })),
      },
    },
  });

  revalidatePath("/forms");
  return { success: true, formId: form.id };
}

export async function updateForm(id: string, formData: FormData) {
  const workspaceId = await getWorkspaceId();

  const raw = {
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || undefined,
  };

  const result = formSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const form = await prisma.form.findFirst({ where: { id, workspaceId } });
  if (!form) return { error: "Formulario nao encontrado" };

  const fieldsJson = formData.get("fields") as string;

  let parsedFields: { label: string; type: string; required: boolean; options?: string[] }[] | null = null;
  if (fieldsJson) {
    try {
      parsedFields = JSON.parse(fieldsJson);
    } catch {
      return { error: "Campos invalidos" };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.form.update({
      where: { id },
      data: result.data,
    });

    if (parsedFields) {
      await tx.formField.deleteMany({ where: { formId: id } });
      await tx.formField.createMany({
        data: parsedFields.map((field, index) => ({
          formId: id,
          label: field.label,
          type: field.type,
          required: field.required,
          options: field.options ? field.options : Prisma.JsonNull,
          order: index,
        })),
      });
    }
  });

  revalidatePath("/forms");
  revalidatePath(`/forms/${id}`);
  return { success: true };
}

export async function deleteForm(id: string) {
  const workspaceId = await getWorkspaceId();
  const form = await prisma.form.findFirst({ where: { id, workspaceId } });
  if (!form) return { error: "Formulario nao encontrado" };

  await prisma.form.delete({ where: { id } });
  revalidatePath("/forms");
  return { success: true };
}

export async function getFormPublic(id: string) {
  return prisma.form.findFirst({
    where: { id, status: "active" },
    include: {
      fields: { orderBy: { order: "asc" } },
    },
  });
}

export async function submitFormPublic(formId: string, data: Record<string, string>) {
  const form = await prisma.form.findFirst({
    where: { id: formId, status: "active" },
    include: { fields: true, workspace: true },
  });

  if (!form) {
    return { error: "Formulario nao encontrado" };
  }

  for (const field of form.fields) {
    if (field.required && !data[field.label]) {
      return { error: `Campo "${field.label}" e obrigatorio` };
    }
  }

  const emailField = form.fields.find((f) => f.type === "email");
  const email = emailField ? data[emailField.label]?.trim() : null;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValidEmail = email && emailRegex.test(email);

  let contactId: string | null = null;

  if (isValidEmail) {
    const phone =
      data["Telefone"] || data["phone"] || data["Phone"] || data["Celular"] || data["WhatsApp"] || null;

    const contact = await prisma.contact.upsert({
      where: {
        email_workspaceId: { email, workspaceId: form.workspaceId },
      },
      create: {
        email,
        firstName: data["Nome"] || data["name"] || null,
        lastName: data["Sobrenome"] || data["lastName"] || null,
        phone,
        source: "form",
        workspaceId: form.workspaceId,
      },
      update: {},
    });
    contactId = contact.id;
  }

  await prisma.leadSubmission.create({
    data: {
      formId,
      data,
      contactId,
    },
  });

  if (contactId) {
    await logActivity({
      type: "form_submitted",
      contactId,
      workspaceId: form.workspaceId,
      metadata: { formId, formName: form.name },
    });

    // Dispatch automation triggers
    await dispatchTrigger("form_submitted", { contactId, formId }, form.workspaceId);
    await dispatchTrigger("contact_created", { contactId }, form.workspaceId);
  }

  return { success: true };
}
