"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/permissions";
import { decryptToken } from "@/lib/meta/encryption";
import { metaGraphGetAllPages, MetaGraphError } from "@/lib/meta/graph";

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
// or Tasks, which live in unrelated tables untouched by this action. MetaAdAccount
// rows cascade-delete with it (see prisma/schema.prisma), so any brand links go too.
export async function disconnectMeta(_formData: FormData) {
  void _formData;
  const user = await requireAdmin();
  if (!user.companyId) return;
  await prisma.metaConnection.deleteMany({ where: { companyId: user.companyId } });
  revalidatePath("/settings");
}

interface MetaAdAccountApiRow {
  account_id: string;
  name?: string;
  currency?: string;
  account_status?: number;
}

// Lists the ad accounts the connected Meta user can access and upserts them
// into MetaAdAccount, keyed by (connectionId, metaAccountId) so re-fetching
// is idempotent and never disturbs an account's existing brand assignment.
// Only lists accounts — no campaigns, ad sets, ads, or insights (Phase 2 scope).
export async function fetchMetaAdAccounts(
  _prevState: string | undefined,
  _formData: FormData
): Promise<string | undefined> {
  void _formData;
  const user = await requireAdmin();
  if (!user.companyId) return "الحساب الحالي غير مرتبط بأي شركة.";

  const connection = await prisma.metaConnection.findUnique({ where: { companyId: user.companyId } });
  if (!connection) return "لا يوجد اتصال Meta فعّال. اربط الحساب أولاً.";
  if (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()) {
    return "انتهت صلاحية رمز الوصول. أعد الربط من قسم Meta Integration.";
  }

  let accounts: MetaAdAccountApiRow[];
  try {
    const accessToken = decryptToken(connection.accessTokenEncrypted);
    accounts = await metaGraphGetAllPages<MetaAdAccountApiRow>("me/adaccounts", accessToken, {
      fields: "account_id,name,currency,account_status",
      limit: "100",
    });
  } catch (err) {
    const message = err instanceof MetaGraphError ? err.message : "فشل جلب الحسابات الإعلانية من Meta.";
    await prisma.metaConnection.update({ where: { id: connection.id }, data: { lastError: message } });
    return message;
  }

  await prisma.$transaction([
    ...accounts.map((a) =>
      prisma.metaAdAccount.upsert({
        where: { connectionId_metaAccountId: { connectionId: connection.id, metaAccountId: a.account_id } },
        create: {
          connectionId: connection.id,
          metaAccountId: a.account_id,
          accountName: a.name ?? a.account_id,
          currency: a.currency ?? null,
          status: a.account_status != null ? String(a.account_status) : null,
        },
        update: {
          accountName: a.name ?? a.account_id,
          currency: a.currency ?? null,
          status: a.account_status != null ? String(a.account_status) : null,
        },
      })
    ),
    prisma.metaConnection.update({ where: { id: connection.id }, data: { lastSyncAt: new Date(), lastError: null } }),
  ]);

  revalidatePath("/settings");
  return undefined;
}

// Assigns (or clears, when brandId is empty) which local Brand a fetched ad
// account belongs to. A brand can only be linked to one ad account at a time
// (see MetaAdAccount.brandId @unique in the schema) — this returns a friendly
// error instead of letting that constraint surface as a raw database error.
export async function assignMetaAdAccountBrand(
  adAccountId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const user = await requireAdmin();
  const brandId = ((formData.get("brandId") as string | null) ?? "").trim() || null;

  const account = await prisma.metaAdAccount.findUnique({
    where: { id: adAccountId },
    include: { connection: true },
  });
  if (!account || account.connection.companyId !== user.companyId) {
    return "الحساب الإعلاني غير موجود.";
  }

  if (brandId) {
    const brand = await prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand || brand.companyId !== user.companyId) {
      return "البراند المحدد غير موجود.";
    }
    const alreadyLinked = await prisma.metaAdAccount.findUnique({ where: { brandId } });
    if (alreadyLinked && alreadyLinked.id !== adAccountId) {
      return `هذا البراند مرتبط بالفعل بحساب إعلاني آخر (${alreadyLinked.accountName}).`;
    }
  }

  await prisma.metaAdAccount.update({ where: { id: adAccountId }, data: { brandId } });
  revalidatePath("/settings");
  return undefined;
}
