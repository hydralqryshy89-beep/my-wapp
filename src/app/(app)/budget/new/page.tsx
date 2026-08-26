import { FormCard } from "@/components/ui/form-card";
import { ExpenseForm } from "@/components/forms/expense-form";
import { createExpense } from "@/app/actions/expenses";
import { prisma } from "@/lib/prisma";
import { getCompany } from "@/lib/data/company";
import { getCurrentPlan } from "@/lib/data/dashboard";
import { requireUser, can } from "@/lib/permissions";
import { AccessDenied } from "@/components/ui/access-denied";

export default async function NewExpensePage({
  searchParams,
}: {
  searchParams: Promise<{ planId?: string }>;
}) {
  const { planId } = await searchParams;
  const user = await requireUser();
  if (!can(user, "budget", "EDIT")) return <AccessDenied label="الميزانية" />;
  const company = await getCompany();
  const [plans, currentPlan] = await Promise.all([
    prisma.plan.findMany({ where: { companyId: company.id }, orderBy: { startDate: "desc" } }),
    getCurrentPlan(),
  ]);
  const resolvedPlanId = planId || currentPlan?.id;
  const campaigns = resolvedPlanId
    ? await prisma.campaign.findMany({ where: { planId: resolvedPlanId }, select: { id: true, name: true, planId: true } })
    : [];

  return (
    <FormCard title="+ إضافة مصروف">
      <ExpenseForm
        plans={plans}
        campaigns={campaigns}
        defaults={{ planId: resolvedPlanId, date: new Date() }}
        action={createExpense}
        submitLabel="إضافة المصروف"
      />
    </FormCard>
  );
}
