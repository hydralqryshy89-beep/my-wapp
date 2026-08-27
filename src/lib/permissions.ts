import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { PERMISSION_RESOURCES, type PermissionLevel, type PermissionResource } from "@/lib/constants";
import { can, type CurrentUser } from "@/lib/access";

export type { CurrentUser } from "@/lib/access";
export { can } from "@/lib/access";

// Cached per-request: every page/action that needs the current user pays for
// this lookup once, no matter how many times it's called during a render.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { accessRole: { include: { permissions: true } } },
  });
  if (!user) return null;

  const permissions = Object.fromEntries(
    PERMISSION_RESOURCES.map((resource) => [resource, "NONE" as PermissionLevel])
  ) as Record<PermissionResource, PermissionLevel>;

  const resourceSet: readonly string[] = PERMISSION_RESOURCES;
  if (user.accessRole) {
    for (const p of user.accessRole.permissions) {
      if (resourceSet.includes(p.resource)) {
        permissions[p.resource as PermissionResource] = p.level as PermissionLevel;
      }
    }
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    jobTitle: user.role,
    avatar: user.avatar,
    companyId: user.companyId,
    isAdmin: user.accessRole?.isAdmin ?? false,
    accessRoleName: user.accessRole?.name ?? null,
    permissions,
  };
});

/** Use at the top of a Server Component page. Redirects to /login if not signed in. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Use at the top of every mutating server action. Throws (never redirects) so the failed mutation surfaces as an error. */
export async function assertPermission(resource: PermissionResource, level: "VIEW" | "EDIT"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("يجب تسجيل الدخول أولاً");
  if (!can(user, resource, level)) {
    throw new Error(`لا تملك صلاحية ${level === "EDIT" ? "التعديل في" : "عرض"} هذا القسم`);
  }
  return user;
}
