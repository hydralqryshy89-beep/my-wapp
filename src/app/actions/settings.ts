"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/permissions";
import { hashPassword } from "@/lib/auth";

function str(formData: FormData, key: string): string {
  return (formData.get(key) as string | null)?.trim() ?? "";
}

export async function updateCompany(id: string, formData: FormData) {
  await assertPermission("settings", "EDIT");
  await prisma.company.update({
    where: { id },
    data: {
      name: str(formData, "name"),
      logo: str(formData, "logo") || null,
      currency: str(formData, "currency") || "IQD",
      language: str(formData, "language") || "ar",
    },
  });
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

export async function createBrand(companyId: string, formData: FormData) {
  await assertPermission("settings", "EDIT");
  await prisma.brand.create({
    data: {
      companyId,
      name: str(formData, "name"),
      logo: str(formData, "logo") || null,
    },
  });
  revalidatePath("/settings");
}

export async function updateBrand(id: string, formData: FormData) {
  await assertPermission("settings", "EDIT");
  await prisma.brand.update({
    where: { id },
    data: {
      name: str(formData, "name"),
      logo: str(formData, "logo") || null,
    },
  });
  revalidatePath("/settings");
}

export async function deleteBrand(id: string, _formData: FormData) {
  void _formData;
  await assertPermission("settings", "EDIT");
  await prisma.brand.delete({ where: { id } });
  revalidatePath("/settings");
}

// User creation/editing manages logins and role assignment — admin-only,
// same reasoning as roles.ts (this is the privilege-escalation surface).
async function requireAdmin() {
  const user = await assertPermission("settings", "VIEW");
  if (!user.isAdmin) throw new Error("إدارة أعضاء الفريق متاحة فقط لمدير النظام");
  return user;
}

export async function createUser(companyId: string, formData: FormData) {
  await requireAdmin();
  const password = (formData.get("password") as string | null) ?? "";
  if (!password || password.length < 8) {
    throw new Error("كلمة المرور مطلوبة (8 أحرف على الأقل) عند إضافة عضو جديد");
  }
  const accessRoleId = str(formData, "accessRoleId");

  await prisma.user.create({
    data: {
      companyId,
      name: str(formData, "name"),
      email: str(formData, "email").toLowerCase(),
      role: str(formData, "role") || null,
      passwordHash: await hashPassword(password),
      accessRoleId: accessRoleId || null,
    },
  });
  revalidatePath("/settings");
}

export async function updateUser(id: string, formData: FormData) {
  await requireAdmin();
  const password = (formData.get("password") as string | null) ?? "";
  const accessRoleId = str(formData, "accessRoleId");

  await prisma.user.update({
    where: { id },
    data: {
      name: str(formData, "name"),
      email: str(formData, "email").toLowerCase(),
      role: str(formData, "role") || null,
      accessRoleId: accessRoleId || null,
      ...(password ? { passwordHash: await hashPassword(password) } : {}),
    },
  });
  revalidatePath("/settings");
}

export async function deleteUser(id: string, _formData: FormData) {
  void _formData;
  const user = await requireAdmin();
  if (user.id === id) {
    throw new Error("لا يمكنك حذف حسابك الخاص أثناء تسجيل الدخول به");
  }
  await prisma.user.delete({ where: { id } });
  revalidatePath("/settings");
}
