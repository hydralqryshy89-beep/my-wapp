import { FormCard } from "@/components/ui/form-card";
import { ObjectiveForm } from "@/components/forms/objective-form";
import { createObjective } from "@/app/actions/objectives";
import { prisma } from "@/lib/prisma";
import { getCompany } from "@/lib/data/company";
import { requireUser, can } from "@/lib/permissions";
import { AccessDenied } from "@/components/ui/access-denied";

export default async function NewObjectivePage({
  searchParams,
}: {
  searchParams: Promise<{ planId?: string }>;
}) {
  const { planId } = await searchParams;
  const user = await requireUser();
  if (!can(user, "objectives", "EDIT")) return <AccessDenied label="الأهداف و KPI" />;
  const company = await getCompany();
  const plans = await prisma.plan.findMany({
    where: { companyId: company.id },
    orderBy: { startDate: "desc" },
  });

  return (
    <FormCard title="+ إضافة هدف">
      <ObjectiveForm plans={plans} defaults={{ planId }} action={createObjective} submitLabel="إضافة الهدف" />
    </FormCard>
  );
}
