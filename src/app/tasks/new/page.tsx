import { FormCard } from "@/components/ui/form-card";
import { TaskForm } from "@/components/forms/task-form";
import { createTask } from "@/app/actions/tasks";
import { prisma } from "@/lib/prisma";
import { getCompany, getUsers } from "@/lib/data/company";
import { getCurrentPlan } from "@/lib/data/dashboard";

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ planId?: string; campaignId?: string }>;
}) {
  const { planId, campaignId } = await searchParams;
  const company = await getCompany();
  const [plans, campaigns, users, currentPlan] = await Promise.all([
    prisma.plan.findMany({ where: { companyId: company.id }, orderBy: { startDate: "desc" } }),
    prisma.campaign.findMany({ where: { plan: { companyId: company.id } }, select: { id: true, name: true, planId: true } }),
    getUsers(),
    getCurrentPlan(),
  ]);

  return (
    <FormCard title="+ إضافة مهمة">
      <TaskForm
        plans={plans}
        campaigns={campaigns}
        users={users}
        defaults={{ planId: planId || currentPlan?.id, campaignId }}
        action={createTask}
        submitLabel="إضافة المهمة"
      />
    </FormCard>
  );
}
