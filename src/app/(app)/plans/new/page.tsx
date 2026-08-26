import { FormCard } from "@/components/ui/form-card";
import { PlanForm } from "@/components/forms/plan-form";
import { createPlan } from "@/app/actions/plans";
import { getCompany } from "@/lib/data/company";
import { requireUser, can } from "@/lib/permissions";
import { AccessDenied } from "@/components/ui/access-denied";

export default async function NewPlanPage() {
  const user = await requireUser();
  if (!can(user, "plans", "EDIT")) return <AccessDenied label="الخطة التسويقية" />;
  const company = await getCompany();

  return (
    <FormCard title="+ إنشاء خطة تسويقية">
      <PlanForm brands={company.brands} action={createPlan} submitLabel="إنشاء الخطة" />
    </FormCard>
  );
}
