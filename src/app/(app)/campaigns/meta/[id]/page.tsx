import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Layers, Rocket, Eye, Users2, MousePointerClick, Link2, UserPlus, ShoppingCart, PlayCircle, TrendingDown } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { formatCurrency, formatDate, formatNumber, formatPercent } from "@/lib/format";
import { ctr, cpc, cpm, cpl, frequency } from "@/lib/calculations";
import { getCompany } from "@/lib/data/company";
import { formatMetaCampaignStatus, formatMetaEntityStatus } from "@/lib/meta/format";
import { syncMetaAdSetsAndAds } from "@/app/actions/meta";
import { MetaCampaignSyncButton } from "@/components/campaigns/meta-campaign-sync-button";
import { requireUser, can } from "@/lib/permissions";
import { AccessDenied } from "@/components/ui/access-denied";

export default async function MetaCampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  if (!can(user, "campaigns", "VIEW")) return <AccessDenied label="الحملات" />;
  const company = await getCompany();

  const campaign = await prisma.metaCampaign.findUnique({
    where: { id },
    include: {
      adAccount: { include: { brand: true, connection: true } },
      adSets: { include: { ads: true }, orderBy: { name: "asc" } },
    },
  });

  if (!campaign || campaign.adAccount.connection.companyId !== company.id) notFound();

  const currency = campaign.adAccount.currency ?? company.currency;

  const insights = await prisma.metaInsight.findMany({
    where: {
      campaignId: campaign.id,
      ...(sp.startDate || sp.endDate
        ? {
            date: {
              ...(sp.startDate ? { gte: new Date(sp.startDate) } : {}),
              ...(sp.endDate ? { lte: new Date(sp.endDate) } : {}),
            },
          }
        : {}),
    },
  });

  const totals = insights.reduce(
    (acc, i) => ({
      spend: acc.spend + i.spend,
      impressions: acc.impressions + i.impressions,
      reach: acc.reach + i.reach,
      clicks: acc.clicks + i.clicks,
      linkClicks: acc.linkClicks + i.linkClicks,
      leads: acc.leads + i.leads,
      conversions: acc.conversions + i.conversions,
      videoViews: acc.videoViews + i.videoViews,
    }),
    { spend: 0, impressions: 0, reach: 0, clicks: 0, linkClicks: 0, leads: 0, conversions: 0, videoViews: 0 }
  );

  const metricCards = [
    { label: "Spend", value: formatCurrency(totals.spend, currency), icon: TrendingDown },
    { label: "Impressions", value: formatNumber(totals.impressions), icon: Eye },
    { label: "Reach", value: formatNumber(totals.reach), icon: Users2 },
    { label: "Clicks", value: formatNumber(totals.clicks), icon: MousePointerClick },
    { label: "Link Clicks", value: formatNumber(totals.linkClicks), icon: Link2 },
    { label: "Leads", value: formatNumber(totals.leads), icon: UserPlus },
    { label: "Conversions", value: formatNumber(totals.conversions), icon: ShoppingCart },
    { label: "Video Views", value: formatNumber(totals.videoViews), icon: PlayCircle },
  ];

  const calcCards = [
    { label: "CTR", value: formatPercent(ctr(totals.clicks, totals.impressions)), formula: "Clicks / Impressions × 100" },
    { label: "CPC", value: formatCurrency(cpc(totals.spend, totals.clicks), currency), formula: "Spend / Clicks" },
    { label: "CPM", value: formatCurrency(cpm(totals.spend, totals.impressions), currency), formula: "Spend / Impressions × 1000" },
    { label: "CPL", value: formatCurrency(cpl(totals.spend, totals.leads), currency), formula: "Spend / Leads" },
    { label: "Frequency", value: frequency(totals.impressions, totals.reach).toFixed(2), formula: "Impressions / Reach" },
  ];

  return (
    <div>
      <PageHeader
        title={campaign.name}
        description={
          <>
            <Link href="/campaigns?view=meta" className="inline-flex items-center gap-1 text-primary hover:underline">
              <ArrowRight size={14} /> حملات Meta
            </Link>
            {campaign.adAccount.brand ? ` · ${campaign.adAccount.brand.name}` : ""} · {campaign.adAccount.accountName}
          </>
        }
        action={user.isAdmin ? <MetaCampaignSyncButton action={syncMetaAdSetsAndAds.bind(null, campaign.id)} label="مزامنة المجموعات والإعلانات" pendingLabel="جاري المزامنة..." /> : undefined}
      />

      <Card className="mb-6 p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-muted">معلومات الحملة</p>
          <Badge>{formatMetaCampaignStatus(campaign.status)}</Badge>
        </div>
        <p className="mb-3 font-medium text-foreground" dir="ltr">
          {campaign.objective ?? "—"}
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
          <div>
            <p className="text-xs text-muted">الميزانية</p>
            <p className="text-foreground">
              {campaign.dailyBudget
                ? `${formatCurrency(campaign.dailyBudget, currency)} / يوم`
                : campaign.lifetimeBudget
                  ? formatCurrency(campaign.lifetimeBudget, currency)
                  : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">الفترة</p>
            <p className="text-foreground">
              {campaign.startTime ? formatDate(campaign.startTime) : "—"} — {campaign.stopTime ? formatDate(campaign.stopTime) : "مستمرة"}
            </p>
          </div>
        </div>
      </Card>

      <h2 className="mb-3 text-sm font-bold text-foreground">الأداء</h2>
      <Card className="mb-5 p-4">
        <form className="flex flex-wrap items-end gap-3" method="get">
          <div>
            <label className="mb-1 block text-xs text-muted">من تاريخ</label>
            <input
              type="date"
              name="startDate"
              defaultValue={sp.startDate}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">إلى تاريخ</label>
            <input
              type="date"
              name="endDate"
              defaultValue={sp.endDate}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
          </div>
          <button className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90" type="submit">
            تطبيق الفلاتر
          </button>
        </form>
      </Card>

      {insights.length === 0 ? (
        <EmptyState
          icon={TrendingDown}
          title="لا توجد نتائج مجلوبة بعد لهذي الحملة"
          description='زامن النتائج من تبويب "Meta Analytics" بصفحة النتائج والتحليلات.'
          action={<ButtonLink href="/analytics?view=meta">الذهاب لـ Meta Analytics</ButtonLink>}
        />
      ) : (
        <div className="mb-6 flex flex-col gap-4">
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {metricCards.map((m) => (
                <div key={m.label} className="rounded-lg bg-muted-surface p-4 text-center">
                  <m.icon size={18} className="mx-auto mb-2 text-primary" />
                  <p className="text-lg font-bold text-foreground">{m.value}</p>
                  <p className="text-xs text-muted">{m.label}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-5">
              {calcCards.map((c) => (
                <div key={c.label} className="rounded-lg border border-border p-4 text-center">
                  <p className="text-xl font-bold text-primary">{c.value}</p>
                  <p className="mt-1 text-xs font-semibold text-foreground">{c.label}</p>
                  <p className="mt-1 text-[11px] text-muted" dir="ltr">
                    {c.formula}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
        <Layers size={16} /> المجموعات الإعلانية ({campaign.adSets.length})
      </h2>

      {campaign.adSets.length === 0 ? (
        <EmptyState
          icon={Rocket}
          title="لا توجد مجموعات إعلانية مجلوبة بعد"
          description={user.isAdmin ? 'اضغط "مزامنة المجموعات والإعلانات" أعلاه لجلبها.' : "اطلب من مدير النظام مزامنة هذه الحملة."}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {campaign.adSets.map((adSet) => (
            <Card key={adSet.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2" dir="ltr">
                  {adSet.name}
                </CardTitle>
                <Badge>{formatMetaEntityStatus(adSet.status)}</Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted">الميزانية</p>
                    <p className="text-foreground">
                      {adSet.dailyBudget
                        ? `${formatCurrency(adSet.dailyBudget, currency)} / يوم`
                        : adSet.lifetimeBudget
                          ? formatCurrency(adSet.lifetimeBudget, currency)
                          : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">الفترة</p>
                    <p className="text-foreground">
                      {adSet.startTime ? formatDate(adSet.startTime) : "—"} — {adSet.stopTime ? formatDate(adSet.stopTime) : "مستمرة"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">الاستهداف</p>
                    <p className="text-foreground" dir="ltr">
                      {adSet.targetingSummary ?? "—"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold text-muted">الإعلانات ({adSet.ads.length})</p>
                  {adSet.ads.length === 0 ? (
                    <p className="text-xs text-muted">لا توجد إعلانات بهذه المجموعة.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {adSet.ads.map((ad) => (
                        <div key={ad.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                          {ad.creativeThumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={ad.creativeThumbnailUrl}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-lg border border-border object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted-surface text-muted">
                              <Rocket size={14} />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground" dir="ltr">
                              {ad.name}
                            </p>
                            {ad.creativeName && (
                              <p className="truncate text-xs text-muted" dir="ltr">
                                {ad.creativeName}
                              </p>
                            )}
                          </div>
                          <Badge>{formatMetaEntityStatus(ad.status)}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
