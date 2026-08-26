import { notFound } from "next/navigation";
import { FormCard } from "@/components/ui/form-card";
import { ObjectiveForm } from "@/components/forms/objective-form";
import { updateObjective } from "@/app/actions/objectives";
import { prisma } from "@/lib/prisma";
import { getCompany } from "@/lib/data/company";
import { requireUser, can } from "@/lib/permissions";
import { AccessDenied } from "@/components/ui/access-denied";

export default async function EditObjectivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!can(user, "objectives", "EDIT")) return <AccessDenied label="الأهداف و KPI" />;
  const company = await getCompany();
  const [objective, plans] = await Promise.all([
    prisma.objective.findUnique({ where: { id } }),
    prisma.plan.findMany({ where: { companyId: company.id }, orderBy: { startDate: "desc" } }),
  ]);

  if (!objective) notFound();

  return (
    <FormCard title="تعديل الهدف">
      <ObjectiveForm plans={plans} defaults={objective} action={updateObjective.bind(null, id)} submitLabel="حفظ التعديلات" />
    </FormCard>
  );
}
