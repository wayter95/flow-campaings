"use server";

import { prisma } from "@/lib/prisma";
import { getWorkspaceId, getSession } from "@/lib/session";
import { encrypt, decrypt, maskApiKey } from "@/lib/encryption";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

// ─── Email/SendGrid Settings ─────────────────────────────────

export async function getEmailSettings() {
  const workspaceId = await getWorkspaceId();

  const settings = await prisma.workspaceSettings.findUnique({
    where: { workspaceId },
  });

  if (!settings) {
    return {
      senderEmail: "",
      senderName: "",
      hasApiKey: false,
      maskedApiKey: "",
    };
  }

  let maskedKey = "";
  if (settings.sendgridApiKey) {
    try {
      const decrypted = decrypt(settings.sendgridApiKey);
      maskedKey = maskApiKey(decrypted);
    } catch {
      maskedKey = "Erro ao ler chave";
    }
  }

  return {
    senderEmail: settings.senderEmail || "",
    senderName: settings.senderName || "",
    hasApiKey: !!settings.sendgridApiKey,
    maskedApiKey: maskedKey,
  };
}

export async function saveEmailSettings(formData: FormData) {
  const workspaceId = await getWorkspaceId();

  const senderEmail = formData.get("senderEmail") as string;
  const senderName = formData.get("senderName") as string;
  const apiKey = formData.get("apiKey") as string;

  const data: {
    senderEmail: string;
    senderName: string;
    sendgridApiKey?: string;
  } = {
    senderEmail: senderEmail || "",
    senderName: senderName || "",
  };

  // Só atualiza a API key se o usuário preencheu uma nova
  if (apiKey && apiKey.trim() !== "") {
    data.sendgridApiKey = encrypt(apiKey.trim());
  }

  await prisma.workspaceSettings.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      ...data,
    },
    update: data,
  });

  revalidatePath("/settings", "layout");
  return { success: true };
}

export async function removeApiKey() {
  const workspaceId = await getWorkspaceId();

  await prisma.workspaceSettings.upsert({
    where: { workspaceId },
    create: { workspaceId },
    update: { sendgridApiKey: null },
  });

  revalidatePath("/settings", "layout");
  return { success: true };
}

/**
 * Retorna as credenciais SendGrid descriptografadas para envio
 * (uso interno, não expor ao client)
 */
export async function getSendgridCredentials(workspaceId: string) {
  const settings = await prisma.workspaceSettings.findUnique({
    where: { workspaceId },
  });

  if (!settings?.sendgridApiKey) {
    return null;
  }

  try {
    return {
      apiKey: decrypt(settings.sendgridApiKey),
      senderEmail: settings.senderEmail || "noreply@example.com",
      senderName: settings.senderName || "",
    };
  } catch {
    console.error("Falha ao descriptografar API key do workspace", workspaceId);
    return null;
  }
}

// ─── WhatsApp/Evolution API Settings ─────────────────────────

export async function getWhatsAppSettings() {
  const workspaceId = await getWorkspaceId();

  const settings = await prisma.workspaceSettings.findUnique({
    where: { workspaceId },
  });

  if (!settings) {
    return {
      evolutionApiUrl: "",
      evolutionInstance: "",
      hasApiKey: false,
      maskedApiKey: "",
    };
  }

  let maskedKey = "";
  if (settings.evolutionApiKey) {
    try {
      const decrypted = decrypt(settings.evolutionApiKey);
      maskedKey = maskApiKey(decrypted);
    } catch {
      maskedKey = "Erro ao ler chave";
    }
  }

  return {
    evolutionApiUrl: settings.evolutionApiUrl || "",
    evolutionInstance: settings.evolutionInstance || "",
    hasApiKey: !!settings.evolutionApiKey,
    maskedApiKey: maskedKey,
  };
}

export async function saveWhatsAppSettings(formData: FormData) {
  const workspaceId = await getWorkspaceId();

  const evolutionApiUrl = formData.get("evolutionApiUrl") as string;
  const evolutionInstance = formData.get("evolutionInstance") as string;
  const apiKey = formData.get("apiKey") as string;

  const data: {
    evolutionApiUrl: string;
    evolutionInstance: string;
    evolutionApiKey?: string;
  } = {
    evolutionApiUrl: evolutionApiUrl || "",
    evolutionInstance: evolutionInstance || "",
  };

  if (apiKey && apiKey.trim() !== "") {
    data.evolutionApiKey = encrypt(apiKey.trim());
  }

  await prisma.workspaceSettings.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      ...data,
    },
    update: data,
  });

  revalidatePath("/settings", "layout");
  return { success: true };
}

export async function removeWhatsAppApiKey() {
  const workspaceId = await getWorkspaceId();

  await prisma.workspaceSettings.upsert({
    where: { workspaceId },
    create: { workspaceId },
    update: { evolutionApiKey: null },
  });

  revalidatePath("/settings", "layout");
  return { success: true };
}

// ─── Account Settings ────────────────────────────────────────

export async function getAccountInfo() {
  const session = await getSession();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true },
  });

  return user;
}

export async function updateAccount(formData: FormData) {
  const session = await getSession();
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;

  if (!email || !email.includes("@")) {
    return { error: "Email inválido" };
  }

  // Verifica se email já existe em outra conta
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing && existing.id !== session.user.id) {
    return { error: "Este email já está em uso por outra conta" };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: name || null, email },
  });

  revalidatePath("/settings", "layout");
  return { success: true };
}

// ─── Password Change ─────────────────────────────────────────

export async function changePassword(formData: FormData) {
  const session = await getSession();
  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "Todos os campos são obrigatórios" };
  }

  if (newPassword.length < 6) {
    return { error: "A nova senha deve ter no mínimo 6 caracteres" };
  }

  if (newPassword !== confirmPassword) {
    return { error: "As senhas não coincidem" };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    return { error: "Usuário não encontrado" };
  }

  const passwordMatch = await bcrypt.compare(currentPassword, user.password);
  if (!passwordMatch) {
    return { error: "Senha atual incorreta" };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: hashedPassword },
  });

  return { success: true };
}

// ─── Workspace Settings ──────────────────────────────────────

export async function getWorkspaceInfo() {
  const workspaceId = await getWorkspaceId();

  return prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true, slug: true },
  });
}

export async function updateWorkspace(formData: FormData) {
  const workspaceId = await getWorkspaceId();
  const name = formData.get("name") as string;

  if (!name || name.trim().length < 2) {
    return { error: "Nome do workspace deve ter no mínimo 2 caracteres" };
  }

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { name: name.trim() },
  });

  revalidatePath("/settings", "layout");
  return { success: true };
}
