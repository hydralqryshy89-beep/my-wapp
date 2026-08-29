import Link from "next/link";
import {
  Eye,
  Users2,
  PlayCircle,
  Heart,
  UserPlus,
  ShoppingCart,
  DollarSign,
  TrendingDown,
  MousePointerClick,
  Link2,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { sumMetrics, cpl, conversionRate, roi, roas, ctr, cpc, cpm, frequency } from "@/lib/calculations";
import { getCompany } from "@/lib/data/company";
import { PLATFORMS } from "@/lib/constants";
import type { Prisma } from "@/generated/prisma/client";
import { requireUser, can } from "@/lib/permissions";
import { AccessDenied } from "@/components/ui/access-denied";
import { MetaCampaignSyncButton } from "@/components/campaigns/meta-campaign-sync-button";
import { syncMetaInsights } from "@/app/actions/meta";
import { cn } from "@/lib/utils";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
    brandId?: string;
    campaignId?: string;
    platform?: string;
    view?: string;
  }>;
}) {
  const sp = await searchParams;
  const view = sp.view === "meta" ? "meta" : "local";
  const user = await requireUser();
  if (!can(user, "analytics", "VIEW")) return <AccessDenied label="النتائج والتحليلات" />;
  const company = await getCompany();

  const [brands, campaigns, metaConnection] = await Promise.all([
    prisma.brand.findMany({ where: { companyId: company.id }, orderBy: { name: "asc" } }),
    prisma.campaign.findMany({
      where: { plan: { companyId: company.id }, ...(sp.brandId ? { brandId: sp.brandId } : {}) },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.metaConnection.findUnique({ where: { companyId: company.id } }),
  ]);

  const metaCampaigns =
    view === "meta" && metaConnection
      ? await prisma.metaCampaign.findMany({
          where: {
            adAccount: { connectionId: metaConnection.id, ...(sp.brandId ? { brandId: sp.brandId } : {}) },
          },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : [];

  const metaInsights =
    view === "meta" && metaConnection
      ? await prisma.metaInsight.findMany({
          where: {
            campaign: { adAccount: { connectionId: metaConnection.id, ...(sp.brandId ? { brandId: sp.brandId } : {}) } },
            ...(sp.campaignId ? { campaignId: sp.campaignId } : {}),
            ...(sp.startDate || sp.endDate
              ? {
                  date: {
                    ...(sp.startDate ? { gte: new Date(sp.startDate) } : {}),
                    ...(sp.endDate ? { lte: new Date(sp.endDate) } : {}),
                  },
                }
              : {}),
          },
        })
      : [];

  const metaTotals = metaInsights.reduce(
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

  const metaMetricCards = [
    { label: "Spend", value: formatCurrency(metaTotals.spend, company.currency), icon: TrendingDown },
    { label: "Impressions", value: formatNumber(metaTotals.impressions), icon: Eye },
    { label: "Reach", value: formatNumber(metaTotals.reach), icon: Users2 },
    { label: "Clicks", value: formatNumber(metaTotals.clicks), icon: MousePointerClick },
    { label: "Link Clicks", value: formatNumber(metaTotals.linkClicks), icon: Link2 },
    { label: "Leads", value: formatNumber(metaTotals.leads), icon: UserPlus },
    { label: "Conversions", value: formatNumber(metaTotals.conversions), icon: ShoppingCart },
    { label: "Video Views", value: formatNumber(metaTotals.videoViews), icon: PlayCircle },
  ];

  const metaCalcCards = [
    { label: "CTR", value: formatPercent(ctr(metaTotals.clicks, metaTotals.impressions)), formula: "Clicks / Impressions × 100" },
    { label: "CPC", value: formatCurrency(cpc(metaTotals.spend, metaTotals.clicks), company.currency), formula: "Spend / Clicks" },
    { label: "CPM", value: formatCurrency(cpm(metaTotals.spend, metaTotals.impressions), company.currency), formula: "Spend / Impressions × 1000" },
    { label: "CPL", value: formatCurrency(cpl(metaTotals.spend, metaTotals.leads), company.currency), formula: "Spend / Leads" },
    { label: "Frequency", value: frequency(metaTotals.impressions, metaTotals.reach).toFixed(2), formula: "Impressions / Reach" },
  ];

  const where: Prisma.MetricWhereInput = {
    plan: { companyId: company.id },
    ...(sp.platform ? { platform: sp.platform } : {}),
    ...(sp.campaignId ? { campaignId: sp.campaignId } : {}),
    ...(sp.brandId && !sp.campaignId ? { campaign: { brandId: sp.brandId } } : {}),
    ...(sp.startDate || sp.endDate
      ? {
          date: {
            ...(sp.startDate ? { gte: new Date(sp.startDate) } : {}),
            ...(sp.endDate ? { lte: new Date(sp.endDate) } : {}),
          },
        }
      : {}),
  };

  const metrics = await prisma.metric.findMany({ where });
  const totals = sumMetrics(metrics);

  const metricCards = [
    { label: "Reach", value: formatNumber(totals.reach), icon: Users2 },
    { label: "Impressions", value: formatNumber(totals.impressions), icon: Eye },
    { label: "Views", value: formatNumber(totals.views), icon: PlayCircle },
    { label: "Engagement", value: formatNumber(totals.engagement), icon: Heart },
    { label: "Leads", value: formatNumber(totals.leads), icon: UserPlus },
    { label: "Sales", value: formatNumber(totals.sales), icon: ShoppingCart },
    { label: "Revenue", value: formatCurrency(totals.revenue, company.currency), icon: DollarSign },
    { label: "Spend", value: formatCurrency(totals.spend, company.currency), icon: TrendingDown },
  ];

  const calcCards = [
    {
      label: "CPL",
      value: formatCurrency(cpl(totals.spend, totals.leads), company.currency),
      formula: "Spend / Leads",
    },
    {
      label: "Conversion Rate",
      value: formatPercent(conversionRate(totals.sales, totals.leads)),
      formula: "Sales / Leads × 100",
    },
    {
      label: "ROI",
      value: formatPercent(roi(totals.revenue, totals.spend)),
      formula: "(Revenue - Spend) / Spend × 100",
    },
    {
      label: "ROAS",
      value: `${roas(totals.revenue, totals.spend).toFixed(2)}x`,
      formula: "Revenue / Spend",
    },
  ];

  return (
    <div>
      <PageHeader title="النتائج والتحليلات" description="حلل أداء حملاتك التسويقية بالأرقام الحقيقية" />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-muted-surface p-1">
          {[
            { key: "local", label: "محلي" },
            { key: "meta", label: "Meta Analytics" },
          ].map((v) => (
            <Link
              key={v.key}
              href={`/analytics?view=${v.key}`}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                view === v.key ? "bg-surface shadow-sm text-primary" : "text-muted hover:text-foreground"
              )}
            >
              {v.label}
            </Link>
          ))}
        </div>
      </div>

      {view === "meta" ? (
        !metaConnection ? (
          <EmptyState
            icon={TrendingDown}
            title="حساب Meta غير متصل"
            description="اربط حساب Meta من الإعدادات → Meta Integration لعرض نتائجه هنا."
            action={<ButtonLink href="/settings">الذهاب للإعدادات</ButtonLink>}
          />
        ) : (
          <div className="flex flex-col gap-6">
            {user.isAdmin && (
              <MetaCampaignSyncButton action={syncMetaInsights} label="مزامنة النتائج الآن (آخر 30 يوم)" pendingLabel="جاري مزامنة النتائج..." />
            )}

            <Card className="p-4">
              <form className="grid grid-cols-1 gap-3 md:grid-cols-4" method="get">
                <input type="hidden" name="view" value="meta" />
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
                <div>
                  <label className="mb-1 block text-xs text-muted">البراند</label>
                  <select name="brandId" defaultValue={sp.brandId ?? ""} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
                    <option value="">الكل</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted">حملة Meta</label>
                  <select name="campaignId" defaultValue={sp.campaignId ?? ""} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
                    <option value="">الكل</option>
                    {metaCampaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-4">
                  <button className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90" type="submit">
                    تطبيق الفلاتر
                  </button>
                </div>
              </form>
            </Card>

            {metaInsights.length === 0 ? (
              <EmptyState
                icon={TrendingDown}
                title="لا توجد نتائج Meta مجلوبة بعد"
                description={user.isAdmin ? 'اضغط "مزامنة النتائج الآن" أعلاه لجلبها.' : "اطلب من مدير النظام مزامنة النتائج."}
              />
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Meta Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {metaMetricCards.map((m) => (
                      <div key={m.label} className="rounded-lg bg-muted-surface p-4 text-center">
                        <m.icon size={18} className="mx-auto mb-2 text-primary" />
                        <p className="text-lg font-bold text-foreground">{m.value}</p>
                        <p className="text-xs text-muted">{m.label}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Calculations</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-5">
                    {metaCalcCards.map((c) => (
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
              </>
            )}
          </div>
        )
      ) : (
        <>
          <Card className="mb-6 p-4">
            <form className="grid grid-cols-1 gap-3 md:grid-cols-5" method="get">
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
              <div>
                <label className="mb-1 block text-xs text-muted">البراند</label>
                <select name="brandId" defaultValue={sp.brandId ?? ""} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
                  <option value="">الكل</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">الحملة</label>
                <select name="campaignId" defaultValue={sp.campaignId ?? ""} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
                  <option value="">الكل</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">المنصة</label>
                <select name="platform" defaultValue={sp.platform ?? ""} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm">
                  <option value="">الكل</option>
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-5">
                <button className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90" type="submit">
                  تطبيق الفلاتر
                </button>
              </div>
            </form>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Marketing Metrics</CardTitle>
            </CardHeader>
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
            <CardHeader>
              <CardTitle>Calculations</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
        </>
      )}
    </div>
  );
}
