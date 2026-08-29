"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { assertPermission, requireUser } from "@/lib/permissions";
import { hashPassword } from "@/lib/auth";
import { readOptionalLogoUpload } from "@/lib/upload";
import { USER_ROLES, type UserRole } from "@/lib/constants";

function str(formData: FormData, key: string): string {
  return (formData.get(key) as string | null)?.trim() ?? "";
}

export async function updateSettings(
  id: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await assertPermission("settings.manage");
  const academyName = str(formData, "academyName");
  if (!academyName) return "يرجى إدخال اسم الأكاديمية";

  const { dataUrl, error } = await readOptionalLogoUpload(formData, "logoFile");
  if (error) return error;

  await prisma.settings.update({
    where: { id },
    data: {
      academyName,
      ...(dataUrl ? { logo: dataUrl } : {}),
      phone: str(formData, "phone") || null,
      email: str(formData, "email") || null,
      address: str(formData, "address") || null,
      instagram: str(formData, "instagram") || null,
      facebook: str(formData, "facebook") || null,
      currency: str(formData, "currency") || "IQD",
    },
  });
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return undefined;
}

async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) throw new Error("إدارة المستخدمين متاحة فقط لمدير النظام");
  return user;
}

export async function createUser(_prevState: string | undefined, formData: FormData): Promise<string | undefined> {
  await requireAdmin();
  const name = str(formData, "name");
  const email = str(formData, "email").toLowerCase();
  const roleRaw = str(formData, "role");
  const role: UserRole = (USER_ROLES as readonly string[]).includes(roleRaw) ? (roleRaw as UserRole) : "STAFF";
  const password = (formData.get("password") as string | null) ?? "";

  if (!name) return "يرجى إدخال اسم العضو";
  if (!password || password.length < 8) {
    return "كلمة المرور مطلوبة (8 أحرف على الأقل) عند إضافة عضو جديد";
  }

  const { dataUrl, error } = await readOptionalLogoUpload(formData, "avatarFile");
  if (error) return error;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return "هذا البريد الإلكتروني مستخدم من قبل عضو آخر بالفعل";
  }

  await prisma.user.create({
    data: {
      name,
      email,
      role,
      passwordHash: await hashPassword(password),
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
  const name = str(formData, "name");
  const email = str(formData, "email").toLowerCase();
  const roleRaw = str(formData, "role");
  const role: UserRole = (USER_ROLES as readonly string[]).includes(roleRaw) ? (roleRaw as UserRole) : "STAFF";
  const password = (formData.get("password") as string | null) ?? "";

  if (!name) return "يرجى إدخال اسم العضو";

  const { dataUrl, error } = await readOptionalLogoUpload(formData, "avatarFile");
  if (error) return error;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== id) {
    return "هذا البريد الإلكتروني مستخدم من قبل عضو آخر بالفعل";
  }

  if (role !== "ADMIN") {
    const target = await prisma.user.findUnique({ where: { id } });
    if (target?.role === "ADMIN") {
      const otherAdmins = await prisma.user.count({ where: { role: "ADMIN", id: { not: id } } });
      if (otherAdmins === 0) {
        return "لا يمكن إزالة صلاحية «مدير النظام» عن هذا الحساب لأنه آخر حساب إداري — سيفقد الجميع القدرة على إدارة المستخدمين والإعدادات.";
      }
    }
  }

  await prisma.user.update({
    where: { id },
    data: {
      name,
      email,
      role,
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
  const target = await prisma.user.findUnique({ where: { id } });
  if (target?.role === "ADMIN") {
    const otherAdmins = await prisma.user.count({ where: { role: "ADMIN", id: { not: id } } });
    if (otherAdmins === 0) {
      throw new Error("لا يمكن حذف هذا الحساب لأنه آخر حساب إداري في النظام.");
    }
  }
  await prisma.user.delete({ where: { id } });
  revalidatePath("/settings");
}
