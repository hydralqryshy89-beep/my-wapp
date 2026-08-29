import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { UserRole } from "@/lib/constants";
import { can, type Action, type CurrentUser } from "@/lib/access";

export type { CurrentUser, Action } from "@/lib/access";
export { can } from "@/lib/access";

// Cached per-request: every page/action that needs the current user pays for
// this lookup once, no matter how many times it's called during a render.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return null;

  const role = (user.role as UserRole) ?? "STAFF";
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role,
    avatar: user.avatar,
    isAdmin: role === "ADMIN",
  };
});

/** Use at the top of a Server Component page. Redirects to /login if not signed in. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Use at the top of every mutating server action. Throws (never redirects) so the failed mutation surfaces as an error. */
export async function assertPermission(action: Action): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("يجب تسجيل الدخول أولاً");
  if (!can(user, action)) {
    throw new Error("لا تملك صلاحية تنفيذ هذا الإجراء");
  }
  return user;
}

/** Use at the top of a Server Component page that only Admin may view. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/dashboard");
  return user;
}
