import {
  Wallet,
  TrendingDown,
  Rocket,
  FileText,
  UserPlus,
  ShoppingCart,
  DollarSign,
  Percent,
  Calendar,
  ListChecks,
  AlertTriangle,
} from "lucide-react";
import { getDashboardData } from "@/lib/data/dashboard";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { CampaignPerformanceChart } from "@/components/charts/campaign-performance-chart";
import { formatCurrency, formatNumber, formatPercent, formatDate } from "@/lib/format";
import { getCompany } from "@/lib/data/company";

export default async function DashboardPage() {
  const [data, company] = await Promise.all([getDashboardData(), getCompany()]);

  if (!data) {
    return (
      <EmptyState
        icon={Rocket}
        title="لا توجد خطة تسويقية بعد"
        description="ابدأ بإنشاء أول خطة تسويقية لعرض لوحة التحكم."
        action={<ButtonLink href="/plans/new">+ إنشاء خطة تسويقية</ButtonLink>}
      />
    );
  }

  const currency = company.currency;

  return (
    <div>
      <PageHeader
        title="لوحة التحكم"
        description={`نظرة عامة على «${data.plan.name}»`}
        action={
          <ButtonLink href={`/plans/${data.plan.id}`} variant="outline">
            عرض الخطة
          </ButtonLink>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="الميزانية" value={formatCurrency(data.budget, currency)} icon={Wallet} tone="primary" />
        <StatCard label="المصروف" value={formatCurrency(data.totalSpend, currency)} icon={TrendingDown} tone="warning" />
        <StatCard label="الحملات النشطة" value={formatNumber(data.activeCampaigns)} icon={Rocket} tone="success" />
        <StatCard label="عدد المحتويات" value={formatNumber(data.contentCount)} icon={FileText} tone="primary" />
        <StatCard label="Leads" value={formatNumber(data.leads)} icon={UserPlus} tone="primary" />
        <StatCard label="Sales" value={formatNumber(data.sales)} icon={ShoppingCart} tone="success" />
        <StatCard label="Revenue" value={formatCurrency(data.revenue, currency)} icon={DollarSign} tone="success" />
        <StatCard label="ROI" value={formatPercent(data.roi)} icon={Percent} tone={data.roi >= 0 ? "success" : "danger"} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>أداء الحملات</CardTitle>
          </CardHeader>
          <CardContent>
            <CampaignPerformanceChart data={data.campaignPerformance} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>الميزانية</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <div className="mb-2 flex items-baseline justify-between text-sm">
                <span className="font-bold text-foreground">
                  {formatCurrency(data.totalSpend, currency)}
                </span>
                <span className="text-muted"> / {formatCurrency(data.budget, currency)}</span>
              </div>
              <ProgressBar value={data.budgetUtilization} />
              <p className="mt-2 text-xs text-muted">
                نسبة الصرف {formatPercent(data.budgetUtilization)}
              </p>
            </div>
            <ButtonLink href="/budget" variant="outline" size="sm" className="w-full">
              تفاصيل الميزانية
            </ButtonLink>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar size={16} /> المحتوى القادم
            </CardTitle>
            <ButtonLink href="/content" variant="ghost" size="sm">
              عرض الكل
            </ButtonLink>
          </CardHeader>
          <CardContent className="p-0">
            {data.upcomingContent.length === 0 ? (
              <EmptyState icon={Calendar} title="لا يوجد محتوى مجدول" />
            ) : (
              <ul className="divide-y divide-border">
                {data.upcomingContent.map((c) => (
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
              <ListChecks size={16} /> المهام
              {data.overdueCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-danger">
                  <AlertTriangle size={12} /> {data.overdueCount} متأخرة
                </span>
              )}
            </CardTitle>
            <ButtonLink href="/tasks" variant="ghost" size="sm">
              عرض الكل
            </ButtonLink>
          </CardHeader>
          <CardContent className="p-0">
            {data.tasks.length === 0 ? (
              <EmptyState icon={ListChecks} title="لا توجد مهام حالية" />
            ) : (
              <ul className="divide-y divide-border">
                {data.tasks.map((t) => {
                  const overdue = t.dueDate && t.dueDate < new Date() && t.status !== "مكتملة";
                  return (
                    <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{t.title}</p>
                        <p className={`text-xs ${overdue ? "text-danger" : "text-muted"}`}>
                          {t.dueDate ? formatDate(t.dueDate) : "بدون موعد"}
                          {t.assignedTo ? ` · ${t.assignedTo.name}` : ""}
                        </p>
                      </div>
                      <Badge variant="priority">{t.priority}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
