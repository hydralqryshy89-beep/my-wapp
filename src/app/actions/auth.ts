"use server";

import { redirect } from "next/navigation";
import { verifyCredentials } from "@/lib/auth";
import { createSession, destroySession } from "@/lib/session";
import { getCurrentUser } from "@/lib/permissions";
import { firstAccessiblePath } from "@/components/layout/nav-items";

export async function login(_prevState: string | undefined, formData: FormData): Promise<string | undefined> {
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const password = (formData.get("password") as string | null) ?? "";

  if (!email || !password) {
    return "الرجاء إدخال البريد الإلكتروني وكلمة المرور";
  }

  const user = await verifyCredentials(email, password);
  if (!user) {
    return "البريد الإلكتروني أو كلمة المرور غير صحيحة";
  }
  if (user === "no-role") {
    return "هذا الحساب ليس له دور وصلاحيات بعد. تواصل مع مدير النظام لتفعيله من الإعدادات.";
  }

  await createSession(user.id);
  const currentUser = await getCurrentUser();
  redirect(currentUser ? firstAccessiblePath(currentUser) : "/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
