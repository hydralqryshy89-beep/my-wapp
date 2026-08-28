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

interface MetaCampaignApiRow {
  id: string;
  name: string;
  status?: string;
  objective?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  stop_time?: string;
}

// Meta returns budgets in the account currency's minor unit, scaled by a
// fixed 100x for every currency — see the MetaCampaign schema comment.
function parseMetaBudget(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n / 100 : null;
}

// Pulls campaigns (list only — no ad sets, ads, or insights) for every ad
// account already fetched via fetchMetaAdAccounts, regardless of whether
// it's linked to a Brand yet. One account failing (e.g. the token no longer
// has access to it) doesn't abort the others — errors are collected and
// summarized in MetaConnection.lastError instead.
export async function syncMetaCampaigns(
  _prevState: string | undefined,
  _formData: FormData
): Promise<string | undefined> {
  void _formData;
  const user = await requireAdmin();
  if (!user.companyId) return "الحساب الحالي غير مرتبط بأي شركة.";

  const connection = await prisma.metaConnection.findUnique({
    where: { companyId: user.companyId },
    include: { adAccounts: true },
  });
  if (!connection) return "لا يوجد اتصال Meta فعّال. اربط الحساب أولاً.";
  if (connection.adAccounts.length === 0) {
    return "لا توجد حسابات إعلانية مجلوبة بعد. اذهب لقسم Meta Integration بالإعدادات واضغط \"جلب الحسابات الإعلانية\" أولاً.";
  }
  if (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()) {
    return "انتهت صلاحية رمز الوصول. أعد الربط من قسم Meta Integration بالإعدادات.";
  }

  const accessToken = decryptToken(connection.accessTokenEncrypted);
  const failures: string[] = [];
  let syncedCount = 0;

  for (const account of connection.adAccounts) {
    let campaigns: MetaCampaignApiRow[];
    try {
      campaigns = await metaGraphGetAllPages<MetaCampaignApiRow>(`act_${account.metaAccountId}/campaigns`, accessToken, {
        fields: "id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time",
        limit: "100",
      });
    } catch (err) {
      const message = err instanceof MetaGraphError ? err.message : "فشل غير متوقع";
      failures.push(`${account.accountName}: ${message}`);
      continue;
    }

    await prisma.$transaction(
      campaigns.map((c) =>
        prisma.metaCampaign.upsert({
          where: { adAccountId_metaCampaignId: { adAccountId: account.id, metaCampaignId: c.id } },
          create: {
            adAccountId: account.id,
            metaCampaignId: c.id,
            name: c.name,
            status: c.status ?? null,
            objective: c.objective ?? null,
            dailyBudget: parseMetaBudget(c.daily_budget),
            lifetimeBudget: parseMetaBudget(c.lifetime_budget),
            startTime: c.start_time ? new Date(c.start_time) : null,
            stopTime: c.stop_time ? new Date(c.stop_time) : null,
          },
          update: {
            name: c.name,
            status: c.status ?? null,
            objective: c.objective ?? null,
            dailyBudget: parseMetaBudget(c.daily_budget),
            lifetimeBudget: parseMetaBudget(c.lifetime_budget),
            startTime: c.start_time ? new Date(c.start_time) : null,
            stopTime: c.stop_time ? new Date(c.stop_time) : null,
          },
        })
      )
    );
    syncedCount += campaigns.length;
  }

  await prisma.metaConnection.update({
    where: { id: connection.id },
    data: {
      lastSyncAt: new Date(),
      lastError: failures.length > 0 ? failures.join(" | ") : null,
    },
  });

  revalidatePath("/campaigns");
  revalidatePath("/settings");

  if (failures.length > 0 && syncedCount === 0) {
    return `فشلت مزامنة الحملات: ${failures.join(" | ")}`;
  }
  if (failures.length > 0) {
    return `تمت مزامنة ${syncedCount} حملة، لكن فشلت بعض الحسابات: ${failures.join(" | ")}`;
  }
  return undefined;
}
