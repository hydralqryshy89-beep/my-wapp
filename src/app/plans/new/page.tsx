import { FormCard } from "@/components/ui/form-card";
import { PlanForm } from "@/components/forms/plan-form";
import { createPlan } from "@/app/actions/plans";
import { getCompany } from "@/lib/data/company";

export default async function NewPlanPage() {
  const company = await getCompany();

  return (
    <FormCard title="+ إنشاء خطة تسويقية">
      <PlanForm brands={company.brands} action={createPlan} submitLabel="إنشاء الخطة" />
    </FormCard>
  );
}
