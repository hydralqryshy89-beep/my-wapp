"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/permissions";

// Meta connection management is admin-only, same reasoning as roles.ts/settings.ts's
// local requireAdmin(): it's a privilege-escalation-adjacent surface (here, access to
// the company's ad account), so it never follows the general "settings" resource matrix.
async function requireAdmin() {
  const user = await assertPermission("settings", "VIEW");
  if (!user.isAdmin) throw new Error("إدارة اتصال Meta متاحة فقط لمدير النظام");
  return user;
}

// Disconnecting only removes the MetaConnection row (and with it the encrypted
// access token) — it never touches Plans, Campaigns, Content, Expenses, Metrics,
// or Tasks, which live in unrelated tables untouched by this action.
export async function disconnectMeta(_formData: FormData) {
  void _formData;
  const user = await requireAdmin();
  if (!user.companyId) return;
  await prisma.metaConnection.deleteMany({ where: { companyId: user.companyId } });
  revalidatePath("/settings");
}
