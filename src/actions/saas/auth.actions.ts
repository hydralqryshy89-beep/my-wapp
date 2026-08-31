"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifySaasCredentials } from "@/lib/saas/auth";
import { createSaasSession, destroySaasSession } from "@/lib/saas/session";
import { loginSchema, registerSchema } from "@/validators/saas";

export async function register(_prevState: string | undefined, formData: FormData): Promise<string | undefined> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input.";
  }

  const existing = await prisma.saasUser.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return "An account with this email already exists.";
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.saasUser.create({
    data: { name: parsed.data.name, email: parsed.data.email, passwordHash },
  });

  await createSaasSession(user.id);
  redirect("/saas/dashboard");
}

export async function login(_prevState: string | undefined, formData: FormData): Promise<string | undefined> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Invalid input.";
  }

  const user = await verifySaasCredentials(parsed.data.email, parsed.data.password);
  if (!user) {
    return "Incorrect email or password.";
  }

  await createSaasSession(user.id);
  redirect("/saas/dashboard");
}

export async function logout() {
  await destroySaasSession();
  redirect("/saas/login");
}
