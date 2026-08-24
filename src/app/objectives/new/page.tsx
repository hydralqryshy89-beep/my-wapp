import { FormCard } from "@/components/ui/form-card";
import { ObjectiveForm } from "@/components/forms/objective-form";
import { createObjective } from "@/app/actions/objectives";
import { prisma } from "@/lib/prisma";
import { getCompany } from "@/lib/data/company";

export default async function NewObjectivePage({
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

  return (
    <FormCard title="+ إضافة هدف">
      <ObjectiveForm plans={plans} defaults={{ planId }} action={createObjective} submitLabel="إضافة الهدف" />
    </FormCard>
  );
}
