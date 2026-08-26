import { Eye, Users2, PlayCircle, Heart, UserPlus, ShoppingCart, DollarSign, TrendingDown } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { sumMetrics, cpl, conversionRate, roi, roas } from "@/lib/calculations";
import { getCompany } from "@/lib/data/company";
import { PLATFORMS } from "@/lib/constants";
import type { Prisma } from "@/generated/prisma/client";
import { requireUser, can } from "@/lib/permissions";
import { AccessDenied } from "@/components/ui/access-denied";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
    brandId?: string;
    campaignId?: string;
    platform?: string;
  }>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  if (!can(user, "analytics", "VIEW")) return <AccessDenied label="النتائج والتحليلات" />;
  const company = await getCompany();

  const [brands, campaigns] = await Promise.all([
    prisma.brand.findMany({ where: { companyId: company.id }, orderBy: { name: "asc" } }),
    prisma.campaign.findMany({
      where: { plan: { companyId: company.id }, ...(sp.brandId ? { brandId: sp.brandId } : {}) },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

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
    </div>
  );
}
