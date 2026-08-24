import { FormCard } from "@/components/ui/form-card";
import { CampaignForm } from "@/components/forms/campaign-form";
import { createCampaign } from "@/app/actions/campaigns";
import { prisma } from "@/lib/prisma";
import { getCompany, getUsers } from "@/lib/data/company";

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ planId?: string }>;
}) {
  const { planId } = await searchParams;
  const company = await getCompany();
  const [plans, users] = await Promise.all([
    prisma.plan.findMany({ where: { companyId: company.id }, orderBy: { startDate: "desc" } }),
    getUsers(),
  ]);

  return (
    <FormCard title="+ إنشاء حملة">
      <CampaignForm
        plans={plans}
        brands={company.brands}
        users={users}
        defaults={{ planId }}
        action={createCampaign}
        submitLabel="إنشاء الحملة"
      />
    </FormCard>
  );
}
