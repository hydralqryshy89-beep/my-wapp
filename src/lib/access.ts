// Pure, framework-agnostic permission logic — no Prisma/session imports here,
// so client components (e.g. the Sidebar) can safely import this without
// pulling Node-only database code into the browser bundle.
import type { PermissionLevel, PermissionResource } from "@/lib/constants";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  jobTitle: string | null;
  avatar: string | null;
  companyId: string | null;
  isAdmin: boolean;
  accessRoleName: string | null;
  permissions: Record<PermissionResource, PermissionLevel>;
}

export function can(user: CurrentUser, resource: PermissionResource, level: "VIEW" | "EDIT"): boolean {
  if (user.isAdmin) return true;
  const userLevel = user.permissions[resource];
  if (level === "VIEW") return userLevel === "VIEW" || userLevel === "EDIT";
  return userLevel === "EDIT";
}
