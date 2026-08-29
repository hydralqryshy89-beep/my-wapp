"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/permissions";
import { decryptToken } from "@/lib/meta/encryption";
import { metaGraphGetAllPages, MetaGraphError } from "@/lib/meta/graph";
import { syncAdAccounts, syncCampaigns, syncInsights, parseMetaDate } from "@/lib/meta/sync";

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

// Lists the ad accounts the connected Meta user can access and upserts them
// into MetaAdAccount — idempotent, never disturbs an account's existing
// brand assignment. Only lists accounts — no campaigns, ad sets, ads, or
// insights (Phase 2 scope). Core logic lives in src/lib/meta/sync.ts, shared
// with the Phase 6 cron job.
export async function fetchMetaAdAccounts(
  _prevState: string | undefined,
  _formData: FormData
): Promise<string | undefined> {
  void _formData;
  const user = await requireAdmin();
  if (!user.companyId) return "الحساب الحالي غير مرتبط بأي شركة.";

  const connection = await prisma.metaConnection.findUnique({ where: { companyId: user.companyId } });
  if (!connection) return "لا يوجد اتصال Meta فعّال. اربط الحساب أولاً.";

  const result = await syncAdAccounts(connection.id);
  if (result.skippedReason) return result.skippedReason;
  if (!result.ok) return result.failures[0] ?? "فشل جلب الحسابات الإعلانية من Meta.";

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

// Meta returns budgets in the account currency's minor unit, scaled by a
// fixed 100x for every currency — see the MetaCampaign schema comment.
// (Still used by syncMetaAdSetsAndAds below.)
function parseMetaBudget(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n / 100 : null;
}

// Pulls campaigns (list only — no ad sets, ads, or insights) for every ad
// account already fetched via fetchMetaAdAccounts, regardless of whether
// it's linked to a Brand yet. One account failing (e.g. the token no longer
// has access to it) doesn't abort the others — errors are collected and
// summarized in MetaConnection.lastError instead. Core logic lives in
// src/lib/meta/sync.ts, shared with the Phase 6 cron job.
export async function syncMetaCampaigns(
  _prevState: string | undefined,
  _formData: FormData
): Promise<string | undefined> {
  void _formData;
  const user = await requireAdmin();
  if (!user.companyId) return "الحساب الحالي غير مرتبط بأي شركة.";

  const connection = await prisma.metaConnection.findUnique({ where: { companyId: user.companyId } });
  if (!connection) return "لا يوجد اتصال Meta فعّال. اربط الحساب أولاً.";

  const result = await syncCampaigns(connection.id);
  if (result.skippedReason === "لا توجد حسابات إعلانية مجلوبة بعد.") {
    return 'لا توجد حسابات إعلانية مجلوبة بعد. اذهب لقسم Meta Integration بالإعدادات واضغط "جلب الحسابات الإعلانية" أولاً.';
  }
  if (result.skippedReason) return result.skippedReason;

  revalidatePath("/campaigns");
  revalidatePath("/settings");

  if (result.failures.length > 0 && result.syncedCount === 0) {
    return `فشلت مزامنة الحملات: ${result.failures.join(" | ")}`;
  }
  if (result.failures.length > 0) {
    return `تمت مزامنة ${result.syncedCount} حملة، لكن فشلت بعض الحسابات: ${result.failures.join(" | ")}`;
  }
  return undefined;
}

interface MetaAdSetApiRow {
  id: string;
  name: string;
  status?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  end_time?: string;
  targeting?: {
    age_min?: number;
    age_max?: number;
    genders?: number[];
    geo_locations?: { countries?: string[] };
  };
}

interface MetaAdApiRow {
  id: string;
  name: string;
  status?: string;
  creative?: { name?: string; thumbnail_url?: string };
}

// Builds a short, human-readable line from a handful of common targeting
// fields — not a dump of Meta's full (much larger) targeting spec.
function buildTargetingSummary(t: MetaAdSetApiRow["targeting"]): string | null {
  if (!t) return null;
  const parts: string[] = [];
  if (t.age_min || t.age_max) parts.push(`العمر ${t.age_min ?? "؟"}-${t.age_max ?? "؟"}`);
  if (t.genders && t.genders.length > 0) {
    parts.push(t.genders.map((g) => (g === 1 ? "ذكور" : g === 2 ? "إناث" : "غير محدد")).join("/"));
  }
  if (t.geo_locations?.countries && t.geo_locations.countries.length > 0) {
    parts.push(t.geo_locations.countries.join(", "));
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

// Pulls ad sets and, for each, its ads — scoped to ONE already-synced
// MetaCampaign at a time (triggered from that campaign's detail page),
// rather than every campaign in one click. A large Business Manager can
// have many campaigns × ad sets, so fanning this out globally like
// syncMetaCampaigns does would turn one click into an unbounded number of
// Graph API calls; syncing per campaign keeps each click's cost predictable.
// Still read-only, still no insights.
export async function syncMetaAdSetsAndAds(
  metaCampaignId: string,
  _prevState: string | undefined,
  _formData: FormData
): Promise<string | undefined> {
  void _formData;
  const user = await requireAdmin();
  if (!user.companyId) return "الحساب الحالي غير مرتبط بأي شركة.";

  const campaign = await prisma.metaCampaign.findUnique({
    where: { id: metaCampaignId },
    include: { adAccount: { include: { connection: true } } },
  });
  if (!campaign || campaign.adAccount.connection.companyId !== user.companyId) {
    return "الحملة غير موجودة.";
  }
  const connection = campaign.adAccount.connection;
  if (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()) {
    return "انتهت صلاحية رمز الوصول. أعد الربط من قسم Meta Integration بالإعدادات.";
  }

  const accessToken = decryptToken(connection.accessTokenEncrypted);
  const failures: string[] = [];
  let adSets: MetaAdSetApiRow[];

  try {
    adSets = await metaGraphGetAllPages<MetaAdSetApiRow>(`${campaign.metaCampaignId}/adsets`, accessToken, {
      fields: "id,name,status,daily_budget,lifetime_budget,start_time,end_time,targeting",
      limit: "100",
    });
  } catch (err) {
    const message = err instanceof MetaGraphError ? err.message : "فشل غير متوقع";
    await prisma.metaConnection.update({ where: { id: connection.id }, data: { lastError: message } });
    return `فشل جلب المجموعات الإعلانية: ${message}`;
  }

  let syncedAdSets = 0;
  let syncedAds = 0;

  for (const adSetRow of adSets) {
    const adSet = await prisma.metaAdSet.upsert({
      where: { campaignId_metaAdSetId: { campaignId: campaign.id, metaAdSetId: adSetRow.id } },
      create: {
        campaignId: campaign.id,
        metaAdSetId: adSetRow.id,
        name: adSetRow.name,
        status: adSetRow.status ?? null,
        dailyBudget: parseMetaBudget(adSetRow.daily_budget),
        lifetimeBudget: parseMetaBudget(adSetRow.lifetime_budget),
        startTime: parseMetaDate(adSetRow.start_time),
        stopTime: parseMetaDate(adSetRow.end_time),
        targetingSummary: buildTargetingSummary(adSetRow.targeting),
      },
      update: {
        name: adSetRow.name,
        status: adSetRow.status ?? null,
        dailyBudget: parseMetaBudget(adSetRow.daily_budget),
        lifetimeBudget: parseMetaBudget(adSetRow.lifetime_budget),
        startTime: parseMetaDate(adSetRow.start_time),
        stopTime: parseMetaDate(adSetRow.end_time),
        targetingSummary: buildTargetingSummary(adSetRow.targeting),
      },
    });
    syncedAdSets += 1;

    let ads: MetaAdApiRow[];
    try {
      ads = await metaGraphGetAllPages<MetaAdApiRow>(`${adSetRow.id}/ads`, accessToken, {
        fields: "id,name,status,creative{name,thumbnail_url}",
        limit: "100",
      });
    } catch (err) {
      const message = err instanceof MetaGraphError ? err.message : "فشل غير متوقع";
      failures.push(`${adSetRow.name}: ${message}`);
      continue;
    }

    await prisma.$transaction(
      ads.map((a) =>
        prisma.metaAd.upsert({
          where: { adSetId_metaAdId: { adSetId: adSet.id, metaAdId: a.id } },
          create: {
            adSetId: adSet.id,
            metaAdId: a.id,
            name: a.name,
            status: a.status ?? null,
            creativeName: a.creative?.name ?? null,
            creativeThumbnailUrl: a.creative?.thumbnail_url ?? null,
          },
          update: {
            name: a.name,
            status: a.status ?? null,
            creativeName: a.creative?.name ?? null,
            creativeThumbnailUrl: a.creative?.thumbnail_url ?? null,
          },
        })
      )
    );
    syncedAds += ads.length;
  }

  await prisma.metaConnection.update({
    where: { id: connection.id },
    data: { lastSyncAt: new Date(), lastError: failures.length > 0 ? failures.join(" | ") : null },
  });

  revalidatePath(`/campaigns/meta/${campaign.id}`);
  revalidatePath("/campaigns");

  if (failures.length > 0 && syncedAds === 0 && syncedAdSets > 0) {
    return `تمت مزامنة ${syncedAdSets} مجموعة إعلانية، لكن فشل جلب الإعلانات: ${failures.join(" | ")}`;
  }
  if (failures.length > 0) {
    return `تمت المزامنة جزئياً (${syncedAdSets} مجموعة، ${syncedAds} إعلان)، مع بعض الأخطاء: ${failures.join(" | ")}`;
  }
  return undefined;
}

// Pulls the last 30 days of daily performance numbers for every already-
// synced campaign, in one click — unlike syncMetaAdSetsAndAds (Phase 4),
// this fans out cheaply: each campaign is a single Graph API call that
// returns up to 30 rows via time_increment, not one call per day. One
// campaign failing doesn't abort the others. Core logic lives in
// src/lib/meta/sync.ts, shared with the Phase 6 cron job.
export async function syncMetaInsights(
  _prevState: string | undefined,
  _formData: FormData
): Promise<string | undefined> {
  void _formData;
  const user = await requireAdmin();
  if (!user.companyId) return "الحساب الحالي غير مرتبط بأي شركة.";

  const connection = await prisma.metaConnection.findUnique({ where: { companyId: user.companyId } });
  if (!connection) return "لا يوجد اتصال Meta فعّال. اربط الحساب أولاً.";

  const result = await syncInsights(connection.id);
  if (result.skippedReason === "لا توجد حملات Meta مجلوبة بعد.") {
    return 'لا توجد حملات Meta مجلوبة بعد. زامن الحملات أولاً من تبويب "حملات Meta".';
  }
  if (result.skippedReason) return result.skippedReason;

  revalidatePath("/analytics");

  if (result.failures.length > 0 && result.syncedCount === 0) {
    return `فشلت مزامنة النتائج: ${result.failures.join(" | ")}`;
  }
  if (result.failures.length > 0) {
    return `تمت مزامنة نتائج ${result.syncedCount} يوم، لكن فشلت بعض الحملات: ${result.failures.join(" | ")}`;
  }
  return undefined;
}
