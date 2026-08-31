import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSaasSession } from "@/lib/saas/session";
import type { CurrentSaasUser } from "@/types/saas";

// Cached per-request: every page/action that needs the current user pays for
// this lookup once, no matter how many times it's called during a render.
export const getCurrentSaasUser = cache(async (): Promise<CurrentSaasUser | null> => {
  const session = await getSaasSession();
  if (!session) return null;

  const user = await prisma.saasUser.findUnique({ where: { id: session.userId } });
  if (!user) return null;

  return { id: user.id, name: user.name, email: user.email, image: user.image };
});

/** Use at the top of a Server Component page. Redirects to /saas/login if not signed in. */
export async function requireSaasUser(): Promise<CurrentSaasUser> {
  const user = await getCurrentSaasUser();
  if (!user) redirect("/saas/login");
  return user;
}
