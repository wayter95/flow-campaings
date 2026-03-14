"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email invalido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

export async function registerUser(formData: FormData) {
  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const result = registerSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { name, email, password } = result.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { error: "Este email ja esta em uso" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const slug = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-") +
    "-" +
    Date.now().toString(36);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      workspaces: {
        create: {
          role: "owner",
          workspace: {
            create: {
              name: `${name}'s Workspace`,
              slug,
            },
          },
        },
      },
    },
  });

  return { success: true, userId: user.id };
}
