"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/permissions";
import { hashPassword } from "@/lib/auth";
import { readOptionalLogoUpload } from "@/lib/upload";

function str(formData: FormData, key: string): string {
  return (formData.get(key) as string | null)?.trim() ?? "";
}

// See roles.ts for why these return an error message instead of throwing it.
export async function updateCompany(
  id: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await assertPermission("settings", "EDIT");
  const { dataUrl, error } = await readOptionalLogoUpload(formData, "logoFile");
  if (error) return error;

  await prisma.company.update({
    where: { id },
    data: {
      name: str(formData, "name"),
      ...(dataUrl ? { logo: dataUrl } : {}),
      currency: str(formData, "currency") || "IQD",
      language: str(formData, "language") || "ar",
    },
  });
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return undefined;
}

export async function createBrand(
  companyId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await assertPermission("settings", "EDIT");
  const { dataUrl, error } = await readOptionalLogoUpload(formData, "logoFile");
  if (error) return error;

  await prisma.brand.create({
    data: {
      companyId,
      name: str(formData, "name"),
      logo: dataUrl ?? null,
    },
  });
  revalidatePath("/settings");
  return undefined;
}

export async function updateBrand(
  id: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await assertPermission("settings", "EDIT");
  const { dataUrl, error } = await readOptionalLogoUpload(formData, "logoFile");
  if (error) return error;

  await prisma.brand.update({
    where: { id },
    data: {
      name: str(formData, "name"),
      ...(dataUrl ? { logo: dataUrl } : {}),
    },
  });
  revalidatePath("/settings");
  return undefined;
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

// See roles.ts for why these return an error message instead of throwing it.
export async function createUser(
  companyId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireAdmin();
  const password = (formData.get("password") as string | null) ?? "";
  if (!password || password.length < 8) {
    return "كلمة المرور مطلوبة (8 أحرف على الأقل) عند إضافة عضو جديد";
  }
  const accessRoleId = str(formData, "accessRoleId");
  const email = str(formData, "email").toLowerCase();
  const { dataUrl, error } = await readOptionalLogoUpload(formData, "avatarFile");
  if (error) return error;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return "هذا البريد الإلكتروني مستخدم من قبل عضو آخر بالفعل";
  }

  await prisma.user.create({
    data: {
      companyId,
      name: str(formData, "name"),
      email,
      role: str(formData, "role") || null,
      passwordHash: await hashPassword(password),
      accessRoleId: accessRoleId || null,
      ...(dataUrl ? { avatar: dataUrl } : {}),
    },
  });
  revalidatePath("/settings");
  return undefined;
}

export async function updateUser(
  id: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireAdmin();
  const password = (formData.get("password") as string | null) ?? "";
  const accessRoleId = str(formData, "accessRoleId");
  const email = str(formData, "email").toLowerCase();
  const { dataUrl, error } = await readOptionalLogoUpload(formData, "avatarFile");
  if (error) return error;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== id) {
    return "هذا البريد الإلكتروني مستخدم من قبل عضو آخر بالفعل";
  }

  await prisma.user.update({
    where: { id },
    data: {
      name: str(formData, "name"),
      email,
      role: str(formData, "role") || null,
      accessRoleId: accessRoleId || null,
      ...(password ? { passwordHash: await hashPassword(password) } : {}),
      ...(dataUrl ? { avatar: dataUrl } : {}),
    },
  });
  revalidatePath("/settings");
  return undefined;
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
