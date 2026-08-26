import { notFound } from "next/navigation";
import { FormCard } from "@/components/ui/form-card";
import { CampaignForm } from "@/components/forms/campaign-form";
import { updateCampaign } from "@/app/actions/campaigns";
import { prisma } from "@/lib/prisma";
import { getCompany, getUsers } from "@/lib/data/company";
import { requireUser, can } from "@/lib/permissions";
import { AccessDenied } from "@/components/ui/access-denied";

export default async function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!can(user, "campaigns", "EDIT")) return <AccessDenied label="الحملات" />;
  const company = await getCompany();
  const [campaign, plans, users] = await Promise.all([
    prisma.campaign.findUnique({ where: { id } }),
    prisma.plan.findMany({ where: { companyId: company.id }, orderBy: { startDate: "desc" } }),
    getUsers(),
  ]);

  if (!campaign) notFound();

  return (
    <FormCard title="تعديل الحملة">
      <CampaignForm
        plans={plans}
        brands={company.brands}
        users={users}
        defaults={campaign}
        action={updateCampaign.bind(null, id)}
        submitLabel="حفظ التعديلات"
      />
    </FormCard>
  );
}
