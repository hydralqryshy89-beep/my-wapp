import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus, Eye, Heart, UserPlus, ShoppingCart, DollarSign, Users2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ButtonLink } from "@/components/ui/button";
import { DeleteButton } from "@/components/ui/delete-button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate, formatNumber, formatPercent } from "@/lib/format";
import { sumMetrics, budgetUtilization, cpl, conversionRate, roi, roas } from "@/lib/calculations";
import { getCompany } from "@/lib/data/company";
import { deleteCampaign } from "@/app/actions/campaigns";
import { FileText, ListChecks } from "lucide-react";
import { requireUser, can } from "@/lib/permissions";
import { AccessDenied } from "@/components/ui/access-denied";

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!can(user, "campaigns", "VIEW")) return <AccessDenied label="الحملات" />;
  const canEditCampaign = can(user, "campaigns", "EDIT");
  const canEditContent = can(user, "content", "EDIT");
  const canEditTasks = can(user, "tasks", "EDIT");
  const company = await getCompany();

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      plan: true,
      brand: true,
      assignedTo: true,
      expenses: true,
      metrics: true,
      content: { include: { assignedTo: true }, orderBy: { date: "asc" } },
      tasks: { include: { assignedTo: true }, orderBy: { dueDate: "asc" } },
    },
  });

  if (!campaign) notFound();

  const spend = campaign.expenses.reduce((s, e) => s + e.amount, 0);
  const util = budgetUtilization(spend, campaign.budget);
  const totals = sumMetrics(campaign.metrics);
  const platforms = campaign.platforms ? campaign.platforms.split(",") : [];

  const metricsCards = [
    { label: "Reach", value: formatNumber(totals.reach), icon: Users2 },
    { label: "Views", value: formatNumber(totals.views), icon: Eye },
    { label: "Engagement", value: formatNumber(totals.engagement), icon: Heart },
    { label: "Leads", value: formatNumber(totals.leads), icon: UserPlus },
    { label: "Sales", value: formatNumber(totals.sales), icon: ShoppingCart },
    { label: "Revenue", value: formatCurrency(totals.revenue, company.currency), icon: DollarSign },
  ];

  const kpiCards = [
    { label: "CPL", value: formatCurrency(cpl(totals.spend, totals.leads), company.currency) },
    { label: "Conversion Rate", value: formatPercent(conversionRate(totals.sales, totals.leads)) },
    { label: "ROI", value: formatPercent(roi(totals.revenue, totals.spend)) },
    { label: "ROAS", value: `${roas(totals.revenue, totals.spend).toFixed(2)}x` },
  ];

  return (
    <div>
      <PageHeader
        title={campaign.name}
        description={
          <>
            <Link href={`/plans/${campaign.planId}`} className="text-primary hover:underline">
              {campaign.plan.name}
            </Link>
            {campaign.brand ? ` · ${campaign.brand.name}` : ""}
          </>
        }
        action={
          canEditCampaign ? (
            <div className="flex gap-2">
              <ButtonLink href={`/campaigns/${campaign.id}/edit`} variant="outline">
                <Pencil size={14} /> تعديل
              </ButtonLink>
              <DeleteButton action={deleteCampaign.bind(null, campaign.id)} className="border border-border" />
            </div>
          ) : undefined
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs text-muted">معلومات الحملة</p>
            <Badge>{campaign.status}</Badge>
          </div>
          <p className="mb-3 font-medium text-foreground">{campaign.objective || "—"}</p>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
            <div>
              <p className="text-xs text-muted">الفترة</p>
              <p className="text-foreground">
                {formatDate(campaign.startDate)} — {formatDate(campaign.endDate)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">المسؤول</p>
              <p className="text-foreground">{campaign.assignedTo?.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted">الجمهور</p>
              <p className="text-foreground">{campaign.audience || "—"}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="mb-2 text-xs text-muted">المنصات</p>
            <div className="flex flex-wrap gap-2">
              {platforms.length === 0 ? (
                <span className="text-sm text-muted">—</span>
              ) : (
                platforms.map((p) => (
                  <span key={p} className="rounded-full bg-muted-surface px-3 py-1 text-xs font-medium text-foreground">
                    {p}
                  </span>
                ))
              )}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <p className="mb-2 text-xs text-muted">الميزانية</p>
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-bold text-foreground">{formatCurrency(spend, company.currency)}</span>
            <span className="text-muted">من {formatCurrency(campaign.budget, company.currency)}</span>
          </div>
          <ProgressBar value={util} />
          <p className="mt-2 text-xs text-muted">نسبة الصرف {formatPercent(util)}</p>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>النتائج</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {metricsCards.map((m) => (
            <div key={m.label} className="rounded-lg bg-muted-surface p-3 text-center">
              <m.icon size={16} className="mx-auto mb-1 text-primary" />
              <p className="text-sm font-bold text-foreground">{m.value}</p>
              <p className="text-xs text-muted">{m.label}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>KPIs</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {kpiCards.map((k) => (
            <div key={k.label} className="rounded-lg border border-border p-3 text-center">
              <p className="text-lg font-bold text-primary">{k.value}</p>
              <p className="text-xs text-muted">{k.label}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText size={16} /> المحتوى المرتبط
            </CardTitle>
            {canEditContent && (
              <ButtonLink href={`/content/new?planId=${campaign.planId}&campaignId=${campaign.id}`} size="sm">
                <Plus size={14} /> إضافة
              </ButtonLink>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {campaign.content.length === 0 ? (
              <EmptyState icon={FileText} title="لا يوجد محتوى مرتبط" />
            ) : (
              <ul className="divide-y divide-border">
                {campaign.content.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.title}</p>
                      <p className="text-xs text-muted">
                        {formatDate(c.date)} · {c.platform} · {c.type}
                      </p>
                    </div>
                    <Badge>{c.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks size={16} /> المهام المرتبطة
            </CardTitle>
            {canEditTasks && (
              <ButtonLink href={`/tasks/new?planId=${campaign.planId}&campaignId=${campaign.id}`} size="sm">
                <Plus size={14} /> إضافة
              </ButtonLink>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {campaign.tasks.length === 0 ? (
              <EmptyState icon={ListChecks} title="لا توجد مهام مرتبطة" />
            ) : (
              <ul className="divide-y divide-border">
                {campaign.tasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{t.title}</p>
                      <p className="text-xs text-muted">{t.assignedTo?.name ?? "—"}</p>
                    </div>
                    <Badge>{t.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
