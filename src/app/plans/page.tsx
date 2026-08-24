import Link from "next/link";
import { Plus, Compass, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate } from "@/lib/format";
import { budgetUtilization } from "@/lib/calculations";
import { getCompany } from "@/lib/data/company";
import { PLAN_STATUSES } from "@/lib/constants";

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const company = await getCompany();

  const plans = await prisma.plan.findMany({
    where: {
      companyId: company.id,
      ...(q ? { name: { contains: q } } : {}),
      ...(status ? { status } : {}),
    },
    include: { brand: true, expenses: true, campaigns: true },
    orderBy: { startDate: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="الخطة التسويقية"
        description="أنشئ وأدر خططك التسويقية"
        action={
          <ButtonLink href="/plans/new">
            <Plus size={16} /> إنشاء خطة تسويقية
          </ButtonLink>
        }
      />

      <Card className="mb-5 p-4">
        <form className="flex flex-wrap items-center gap-3" method="get">
          <div className="relative min-w-56 flex-1">
            <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="بحث باسم الخطة..."
              className="w-full rounded-lg border border-border bg-surface py-2 pe-3 ps-9 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="">كل الحالات</option>
            {PLAN_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button className="rounded-lg bg-muted-surface px-4 py-2 text-sm font-semibold hover:bg-border" type="submit">
            تصفية
          </button>
        </form>
      </Card>

      {plans.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="لا توجد خطط بعد"
          description="ابدأ بإنشاء خطتك التسويقية الأولى."
          action={<ButtonLink href="/plans/new">+ إنشاء خطة تسويقية</ButtonLink>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan) => {
            const spend = plan.expenses.reduce((s, e) => s + e.amount, 0);
            const util = budgetUtilization(spend, plan.budget);
            return (
              <Link key={plan.id} href={`/plans/${plan.id}`}>
                <Card className="h-full p-5 transition-shadow hover:shadow-md">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-foreground">{plan.name}</h3>
                      <p className="text-xs text-muted">{plan.brand?.name ?? "كل البراندات"}</p>
                    </div>
                    <Badge>{plan.status}</Badge>
                  </div>
                  <p className="mb-3 text-xs text-muted">
                    {formatDate(plan.startDate)} — {formatDate(plan.endDate)}
                  </p>
                  <div className="mb-3">
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-foreground">{formatCurrency(spend, company.currency)}</span>
                      <span className="text-muted">من {formatCurrency(plan.budget, company.currency)}</span>
                    </div>
                    <ProgressBar value={util} size="sm" />
                  </div>
                  <div className="flex gap-4 text-xs text-muted">
                    <span>{plan.campaigns.length} حملة</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
