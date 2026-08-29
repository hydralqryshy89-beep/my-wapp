"use server";

import { redirect } from "next/navigation";
import { verifyCredentials } from "@/lib/auth";
import { createSession, destroySession } from "@/lib/session";
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

  await createSession(user.id);
  redirect(firstAccessiblePath());
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
