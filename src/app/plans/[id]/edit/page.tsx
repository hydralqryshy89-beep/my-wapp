import { notFound } from "next/navigation";
import { FormCard } from "@/components/ui/form-card";
import { PlanForm } from "@/components/forms/plan-form";
import { updatePlan } from "@/app/actions/plans";
import { getCompany } from "@/lib/data/company";
import { prisma } from "@/lib/prisma";

export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [company, plan] = await Promise.all([
    getCompany(),
    prisma.plan.findUnique({ where: { id } }),
  ]);

  if (!plan) notFound();

  return (
    <FormCard title="تعديل الخطة التسويقية">
      <PlanForm brands={company.brands} defaults={plan} action={updatePlan.bind(null, id)} submitLabel="حفظ التعديلات" />
    </FormCard>
  );
}
