"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/permissions";
import { PERMISSION_RESOURCES, PERMISSION_LEVELS, type PermissionLevel } from "@/lib/constants";

function str(formData: FormData, key: string): string {
  return (formData.get(key) as string | null)?.trim() ?? "";
}

function readPermissions(formData: FormData): { resource: string; level: PermissionLevel }[] {
  return PERMISSION_RESOURCES.map((resource) => {
    const raw = str(formData, `perm_${resource}`);
    const level: PermissionLevel = (PERMISSION_LEVELS as readonly string[]).includes(raw)
      ? (raw as PermissionLevel)
      : "NONE";
    return { resource, level };
  });
}

// Only admins can manage roles — this is the privilege-escalation surface, so it never
// follows the "settings" resource matrix like the rest of the settings page does.
async function requireAdmin() {
  const user = await assertPermission("settings", "VIEW");
  if (!user.isAdmin) throw new Error("إدارة الأدوار والصلاحيات متاحة فقط لمدير النظام");
  return user;
}

// createRole/updateRole return an error message (or undefined on success) instead of
// throwing: Next.js redacts thrown Server Action error messages in production builds,
// so an admin who accidentally locks everyone out (see updateRole's guard below) would
// only ever see a generic "something went wrong" — this way the real reason shows up
// inline via useActionState (see src/components/settings/role-form.tsx).
export async function createRole(
  companyId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await requireAdmin();
  const name = str(formData, "name");
  const isAdmin = formData.get("isAdmin") === "on";
  const permissions = readPermissions(formData);

  await prisma.role.create({
    data: {
      companyId,
      name,
      isAdmin,
      permissions: { create: permissions },
    },
  });
  revalidatePath("/settings");
  return undefined;
}

export async function updateRole(
  id: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const admin = await requireAdmin();
  const name = str(formData, "name");
  const isAdmin = formData.get("isAdmin") === "on";
  const permissions = readPermissions(formData);

  if (!isAdmin) {
    const otherAdminRoles = await prisma.role.count({
      where: { companyId: admin.companyId ?? undefined, isAdmin: true, id: { not: id } },
    });
    if (otherAdminRoles === 0) {
      return "لا يمكن إزالة صلاحية «مدير النظام» من هذا الدور لأنه آخر دور إداري — سيفقد الجميع القدرة على إدارة الأدوار والمستخدمين. أنشئ دوراً إدارياً آخر أولاً.";
    }
  }

  await prisma.$transaction([
    prisma.role.update({ where: { id }, data: { name, isAdmin } }),
    ...permissions.map((p) =>
      prisma.rolePermission.upsert({
        where: { roleId_resource: { roleId: id, resource: p.resource } },
        update: { level: p.level },
        create: { roleId: id, resource: p.resource, level: p.level },
      })
    ),
  ]);
  revalidatePath("/settings");
  return undefined;
}

export async function deleteRole(id: string, _formData: FormData) {
  void _formData;
  const admin = await requireAdmin();
  const assignedCount = await prisma.user.count({ where: { accessRoleId: id } });
  if (assignedCount > 0) {
    throw new Error("لا يمكن حذف هذا الدور لأنه مرتبط بأعضاء حالياً. أعد تعيين دورهم أولاً.");
  }
  const role = await prisma.role.findUnique({ where: { id } });
  if (role?.isAdmin) {
    const otherAdminRoles = await prisma.role.count({
      where: { companyId: admin.companyId ?? undefined, isAdmin: true, id: { not: id } },
    });
    if (otherAdminRoles === 0) {
      throw new Error("لا يمكن حذف هذا الدور لأنه آخر دور إداري في النظام.");
    }
  }
  await prisma.role.delete({ where: { id } });
  revalidatePath("/settings");
}
