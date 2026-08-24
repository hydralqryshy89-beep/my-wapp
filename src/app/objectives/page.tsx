import Link from "next/link";
import { Plus, Target, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/ui/delete-button";
import { kpiProgress } from "@/lib/calculations";
import { formatPercent } from "@/lib/format";
import { deleteObjectiveFromList } from "@/app/actions/objectives";
import { getCompany } from "@/lib/data/company";

export default async function ObjectivesPage({
  searchParams,
}: {
  searchParams: Promise<{ planId?: string }>;
}) {
  const { planId } = await searchParams;
  const company = await getCompany();

  const plans = await prisma.plan.findMany({
    where: { companyId: company.id },
    orderBy: { startDate: "desc" },
  });

  const objectives = await prisma.objective.findMany({
    where: { planId: planId || undefined, plan: { companyId: company.id } },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="الأهداف و KPI"
        description="تابع أهداف خطتك التسويقية ومؤشرات الأداء"
        action={
          <ButtonLink href={`/objectives/new${planId ? `?planId=${planId}` : ""}`}>
            <Plus size={16} /> إضافة هدف
          </ButtonLink>
        }
      />

      <Card className="mb-5 p-4">
        <form className="flex flex-wrap items-center gap-3" method="get">
          <select
            name="planId"
            defaultValue={planId ?? ""}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          >
            <option value="">كل الخطط</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button className="rounded-lg bg-muted-surface px-4 py-2 text-sm font-semibold hover:bg-border" type="submit">
            تصفية
          </button>
        </form>
      </Card>

      {objectives.length === 0 ? (
        <EmptyState
          icon={Target}
          title="لا توجد أهداف بعد"
          description="أضف أهدافاً ومؤشرات أداء لمتابعة تقدم خطتك."
          action={<ButtonLink href="/objectives/new">+ إضافة هدف</ButtonLink>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {objectives.map((o) => {
            const progress = kpiProgress(o.current, o.target);
            return (
              <Card key={o.id} className="p-5">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{o.name}</p>
                    <Link href={`/plans/${o.planId}`} className="text-xs text-primary hover:underline">
                      {o.plan.name}
                    </Link>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/objectives/${o.id}/edit`}
                      className="rounded-lg p-1.5 text-muted hover:bg-muted-surface hover:text-foreground"
                    >
                      <Pencil size={14} />
                    </Link>
                    <DeleteButton action={deleteObjectiveFromList.bind(null, o.id)} />
                  </div>
                </div>
                <p className="mb-3 text-xs font-medium text-muted">{o.kpiType}</p>
                <div className="mb-1 flex justify-between text-xs text-muted">
                  <span>
                    Current: {o.current.toLocaleString("ar-u-nu-latn")} {o.unit}
                  </span>
                  <span>
                    Target: {o.target.toLocaleString("ar-u-nu-latn")} {o.unit}
                  </span>
                </div>
                <ProgressBar value={progress} />
                <p className="mt-1.5 text-left text-sm font-bold text-primary">{formatPercent(progress)}</p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
