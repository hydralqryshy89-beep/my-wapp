// Shared sync logic for Meta ad accounts / campaigns / insights — used by
// BOTH the admin-triggered Server Actions (src/app/actions/meta.ts) and the
// scheduled cron route (src/app/api/meta/cron/sync/route.ts), so the two
// entry points can never drift apart into two different implementations.
// Deliberately NOT a "use server" file: nothing here is meant to be called
// directly from the client — only from other server-side code.
import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/meta/encryption";
import { metaGraphGetAllPages, MetaGraphError } from "@/lib/meta/graph";

export interface SyncOutcome {
  /** True once at least one thing (account/campaign/day) was written and nothing failed outright. */
  ok: boolean;
  /** Count of rows written (accounts fetched, campaigns synced, insight-days synced). */
  syncedCount: number;
  /** Per-item failure messages ("<name>: <reason>") — sync keeps going past individual failures. */
  failures: string[];
  /** Set instead of attempting a sync at all — no connection, no token, expired token, nothing to sync yet. */
  skippedReason?: string;
}

function expiredOutcome(): SyncOutcome {
  return { ok: false, syncedCount: 0, failures: [], skippedReason: "انتهت صلاحية رمز الوصول. أعد الربط من قسم Meta Integration بالإعدادات." };
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
export async function syncAdAccounts(connectionId: string): Promise<SyncOutcome> {
  const connection = await prisma.metaConnection.findUnique({ where: { id: connectionId } });
  if (!connection) return { ok: false, syncedCount: 0, failures: [], skippedReason: "لا يوجد اتصال Meta فعّال." };
  if (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()) return expiredOutcome();

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
    return { ok: false, syncedCount: 0, failures: [message] };
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

  return { ok: true, syncedCount: accounts.length, failures: [] };
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
// account already fetched via syncAdAccounts, regardless of whether it's
// linked to a Brand yet. One account failing doesn't abort the others.
export async function syncCampaigns(connectionId: string): Promise<SyncOutcome> {
  const connection = await prisma.metaConnection.findUnique({
    where: { id: connectionId },
    include: { adAccounts: true },
  });
  if (!connection) return { ok: false, syncedCount: 0, failures: [], skippedReason: "لا يوجد اتصال Meta فعّال." };
  if (connection.adAccounts.length === 0) {
    return { ok: false, syncedCount: 0, failures: [], skippedReason: "لا توجد حسابات إعلانية مجلوبة بعد." };
  }
  if (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()) return expiredOutcome();

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
    data: { lastSyncAt: new Date(), lastError: failures.length > 0 ? failures.join(" | ") : null },
  });

  return { ok: failures.length === 0 || syncedCount > 0, syncedCount, failures };
}

interface MetaActionRow {
  action_type: string;
  value: string;
}

interface MetaInsightApiRow {
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  inline_link_clicks?: string;
  actions?: MetaActionRow[];
  video_play_actions?: MetaActionRow[];
  date_start: string;
}

function sumActionValues(actions: MetaActionRow[] | undefined, matches: (actionType: string) => boolean): number {
  if (!actions) return 0;
  return actions.filter((a) => matches(a.action_type)).reduce((sum, a) => sum + (Number(a.value) || 0), 0);
}

// Meta's action taxonomy varies by account setup (custom conversions, pixel
// events, catalog sales, ...) — these two matchers are a best-effort, common-
// case read: "lead" covers Lead Ads and lead-type pixel/offline events;
// "offsite_conversion"/"purchase" covers the most common conversion events.
// This can under- or over-count for accounts with unusual custom events.
function extractLeads(actions: MetaActionRow[] | undefined): number {
  return sumActionValues(actions, (t) => t.includes("lead"));
}
function extractConversions(actions: MetaActionRow[] | undefined): number {
  return sumActionValues(actions, (t) => t.includes("offsite_conversion") || t === "purchase");
}

// Pulls the last 30 days of daily performance numbers for every already-
// synced campaign. Cheap to fan out: each campaign is a single Graph API
// call that returns up to 30 rows via time_increment, not one call per day.
export async function syncInsights(connectionId: string): Promise<SyncOutcome> {
  const connection = await prisma.metaConnection.findUnique({
    where: { id: connectionId },
    include: { adAccounts: { include: { campaigns: true } } },
  });
  if (!connection) return { ok: false, syncedCount: 0, failures: [], skippedReason: "لا يوجد اتصال Meta فعّال." };

  const campaigns = connection.adAccounts.flatMap((a) => a.campaigns);
  if (campaigns.length === 0) {
    return { ok: false, syncedCount: 0, failures: [], skippedReason: "لا توجد حملات Meta مجلوبة بعد." };
  }
  if (connection.tokenExpiresAt && connection.tokenExpiresAt < new Date()) return expiredOutcome();

  const accessToken = decryptToken(connection.accessTokenEncrypted);
  const failures: string[] = [];
  let syncedDays = 0;

  for (const campaign of campaigns) {
    let rows: MetaInsightApiRow[];
    try {
      rows = await metaGraphGetAllPages<MetaInsightApiRow>(`${campaign.metaCampaignId}/insights`, accessToken, {
        fields: "spend,impressions,reach,clicks,inline_link_clicks,actions,video_play_actions,date_start,date_stop",
        time_increment: "1",
        date_preset: "last_30d",
        limit: "100",
      });
    } catch (err) {
      const message = err instanceof MetaGraphError ? err.message : "فشل غير متوقع";
      failures.push(`${campaign.name}: ${message}`);
      continue;
    }

    await prisma.$transaction(
      rows.map((r) =>
        prisma.metaInsight.upsert({
          where: { campaignId_date: { campaignId: campaign.id, date: new Date(r.date_start) } },
          create: {
            campaignId: campaign.id,
            date: new Date(r.date_start),
            spend: Number(r.spend) || 0,
            impressions: Number(r.impressions) || 0,
            reach: Number(r.reach) || 0,
            clicks: Number(r.clicks) || 0,
            linkClicks: Number(r.inline_link_clicks) || 0,
            leads: extractLeads(r.actions),
            conversions: extractConversions(r.actions),
            videoViews: sumActionValues(r.video_play_actions, () => true),
          },
          update: {
            spend: Number(r.spend) || 0,
            impressions: Number(r.impressions) || 0,
            reach: Number(r.reach) || 0,
            clicks: Number(r.clicks) || 0,
            linkClicks: Number(r.inline_link_clicks) || 0,
            leads: extractLeads(r.actions),
            conversions: extractConversions(r.actions),
            videoViews: sumActionValues(r.video_play_actions, () => true),
          },
        })
      )
    );
    syncedDays += rows.length;
  }

  await prisma.metaConnection.update({
    where: { id: connection.id },
    data: { lastSyncAt: new Date(), lastError: failures.length > 0 ? failures.join(" | ") : null },
  });

  return { ok: failures.length === 0 || syncedDays > 0, syncedCount: syncedDays, failures };
}
