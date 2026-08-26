import Link from "next/link";
import { Plus, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/ui/delete-button";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { budgetUtilization } from "@/lib/calculations";
import { getCompany } from "@/lib/data/company";
import { getCurrentPlan } from "@/lib/data/dashboard";
import { deleteExpense } from "@/app/actions/expenses";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { requireUser, can } from "@/lib/permissions";
import { AccessDenied } from "@/components/ui/access-denied";

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ planId?: string; category?: string; campaignId?: string }>;
}) {
  const { planId: planIdParam, category, campaignId } = await searchParams;
  const user = await requireUser();
  if (!can(user, "budget", "VIEW")) return <AccessDenied label="الميزانية" />;
  const canEdit = can(user, "budget", "EDIT");
  const company = await getCompany();

  const plans = await prisma.plan.findMany({ where: { companyId: company.id }, orderBy: { startDate: "desc" } });
  const currentPlan = planIdParam ? plans.find((p) => p.id === planIdParam) : await getCurrentPlan();
  const planId = currentPlan?.id;

  const [campaigns, expenses] = await Promise.all([
    planId ? prisma.campaign.findMany({ where: { planId }, select: { id: true, name: true, planId: true } }) : [],
    planId
      ? prisma.expense.findMany({
          where: {
            planId,
            ...(category ? { category } : {}),
            ...(campaignId ? { campaignId } : {}),
          },
          include: { campaign: true },
          orderBy: { date: "desc" },
        })
      : [],
  ]);

  const totalSpend = expenses.reduce((s, e) => s + e.amount, 0);
  const budget = currentPlan?.budget ?? 0;
  const remaining = budget - totalSpend;
  const util = budgetUtilization(totalSpend, budget);

  const byCategory = EXPENSE_CATEGORIES.map((cat) => ({
    category: cat,
    amount: expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter((c) => c.amount > 0);

  return (
    <div>
      <PageHeader
        title="الميزانية"
        description={currentPlan ? currentPlan.name : "لا توجد خطة"}
        action={
          planId && canEdit ? (
            <ButtonLink href={`/budget/new?planId=${planId}`}>
              <Plus size={16} /> إضافة مصروف
            </ButtonLink>
          ) : undefined
        }
      />

      <Card className="mb-5 p-4">
        <form className="flex flex-wrap items-center gap-3" method="get">
          <select name="planId" defaultValue={planId ?? ""} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select name="campaignId" defaultValue={campaignId ?? ""} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <option value="">كل الحملات</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select name="category" defaultValue={category ?? ""} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
            <option value="">كل التصنيفات</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button className="rounded-lg bg-muted-surface px-4 py-2 text-sm font-semibold hover:bg-border" type="submit">
            تصفية
          </button>
        </form>
      </Card>

      {!currentPlan ? (
        <EmptyState icon={Wallet} title="لا توجد خطة تسويقية بعد" action={<ButtonLink href="/plans/new">+ إنشاء خطة</ButtonLink>} />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card className="p-4 text-center">
              <p className="text-xs text-muted">إجمالي الميزانية</p>
              <p className="mt-1 text-lg font-bold text-foreground">{formatCurrency(budget, company.currency)}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-muted">المصروف</p>
              <p className="mt-1 text-lg font-bold text-foreground">{formatCurrency(totalSpend, company.currency)}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-muted">المتبقي</p>
              <p className="mt-1 text-lg font-bold text-foreground">{formatCurrency(remaining, company.currency)}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-muted">نسبة الصرف</p>
              <p className="mt-1 text-lg font-bold text-primary">{util.toFixed(1)}%</p>
            </Card>
          </div>

          <Card className="mb-6 p-5">
            <ProgressBar value={util} />
            <p className="mt-2 text-xs text-muted">
              {formatCurrency(totalSpend, company.currency)} من {formatCurrency(budget, company.currency)}
            </p>
          </Card>

          {byCategory.length > 0 && (
            <Card className="mb-6 p-5">
              <p className="mb-3 text-xs font-semibold text-muted">توزيع المصروفات حسب التصنيف</p>
              <div className="flex flex-col gap-2">
                {byCategory.map((c) => (
                  <div key={c.category} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-xs text-foreground">{c.category}</span>
                    <ProgressBar value={(c.amount / totalSpend) * 100} size="sm" className="flex-1" />
                    <span className="w-24 shrink-0 text-left text-xs text-muted">
                      {formatCurrency(c.amount, company.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-0">
            {expenses.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="لا توجد مصروفات بعد"
                action={canEdit ? <ButtonLink href={`/budget/new?planId=${planId}`}>+ إضافة مصروف</ButtonLink> : undefined}
              />
            ) : (
              <Table>
                <Thead>
                  <Tr>
                    <Th>التاريخ</Th>
                    <Th>الوصف</Th>
                    <Th>الحملة</Th>
                    <Th>التصنيف</Th>
                    <Th>المبلغ</Th>
                    <Th></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {expenses.map((e) => (
                    <Tr key={e.id}>
                      <Td className="text-xs text-muted">{formatDate(e.date)}</Td>
                      <Td>{e.description || "—"}</Td>
                      <Td className="text-xs text-muted">{e.campaign?.name ?? "—"}</Td>
                      <Td>
                        <Badge>{e.category}</Badge>
                      </Td>
                      <Td>{formatCurrency(e.amount, company.currency)}</Td>
                      <Td>
                        {canEdit && (
                          <div className="flex gap-2">
                            <Link href={`/budget/${e.id}/edit`} className="text-xs font-medium text-primary hover:underline">
                              تعديل
                            </Link>
                            <DeleteButton action={deleteExpense.bind(null, e.id)} />
                          </div>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
