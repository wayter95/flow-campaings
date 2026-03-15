"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "no-reply@mylarapp.com";
const APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: SENDGRID_FROM_EMAIL, name: "Flow Campaigns" },
      subject,
      content: [{ type: "text/html", value: html }],
    }),
  });
  return res.ok;
}

export async function requestPasswordReset(formData: FormData) {
  const email = (formData.get("email") as string)?.trim().toLowerCase();

  if (!email || !z.string().email().safeParse(email).success) {
    return { error: "Email invalido" };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success to prevent email enumeration
  if (!user) {
    return { success: true };
  }

  // Invalidate any existing tokens for this email
  await prisma.passwordResetToken.updateMany({
    where: { email, used: false },
    data: { used: true },
  });

  // Generate secure token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: { token, email, expiresAt },
  });

  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <div style="background:#18181b;padding:32px 24px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:600;">Flow Campaigns</h1>
        </div>
        <div style="padding:32px 24px;">
          <h2 style="margin:0 0 8px;font-size:18px;color:#18181b;">Redefinir sua senha</h2>
          <p style="color:#71717a;font-size:14px;line-height:1.6;margin:0 0 24px;">
            Recebemos uma solicitacao para redefinir a senha da sua conta. Clique no botao abaixo para criar uma nova senha.
          </p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${resetUrl}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:500;">
              Redefinir Senha
            </a>
          </div>
          <p style="color:#a1a1aa;font-size:12px;line-height:1.5;margin:24px 0 0;">
            Este link expira em <strong>1 hora</strong>. Se voce nao solicitou a redefinicao de senha, ignore este email.
          </p>
          <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0;">
          <p style="color:#a1a1aa;font-size:11px;margin:0;">
            Se o botao nao funcionar, copie e cole este link no navegador:<br>
            <a href="${resetUrl}" style="color:#71717a;word-break:break-all;">${resetUrl}</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail(email, "Redefinir sua senha - Flow Campaigns", html);

  return { success: true };
}

export async function resetPassword(formData: FormData) {
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!token) {
    return { error: "Token invalido" };
  }

  if (!password || password.length < 6) {
    return { error: "Senha deve ter pelo menos 6 caracteres" };
  }

  if (password !== confirmPassword) {
    return { error: "As senhas nao coincidem" };
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken) {
    return { error: "Link invalido ou expirado" };
  }

  if (resetToken.used) {
    return { error: "Este link ja foi utilizado" };
  }

  if (resetToken.expiresAt < new Date()) {
    return { error: "Este link expirou. Solicite um novo." };
  }

  const user = await prisma.user.findUnique({
    where: { email: resetToken.email },
  });

  if (!user) {
    return { error: "Usuario nao encontrado" };
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    }),
  ]);

  return { success: true };
}
