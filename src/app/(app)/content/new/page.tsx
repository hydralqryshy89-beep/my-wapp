import { FormCard } from "@/components/ui/form-card";
import { ContentForm } from "@/components/forms/content-form";
import { createContent } from "@/app/actions/content";
import { prisma } from "@/lib/prisma";
import { getCompany, getUsers } from "@/lib/data/company";
import { getCurrentPlan } from "@/lib/data/dashboard";
import { requireUser, can } from "@/lib/permissions";
import { AccessDenied } from "@/components/ui/access-denied";

export default async function NewContentPage({
  searchParams,
}: {
  searchParams: Promise<{ planId?: string; campaignId?: string; date?: string }>;
}) {
  const { planId, campaignId, date } = await searchParams;
  const user = await requireUser();
  if (!can(user, "content", "EDIT")) return <AccessDenied label="تقويم المحتوى" />;
  const company = await getCompany();
  const [plans, campaigns, users, currentPlan] = await Promise.all([
    prisma.plan.findMany({ where: { companyId: company.id }, orderBy: { startDate: "desc" } }),
    prisma.campaign.findMany({ where: { plan: { companyId: company.id } }, select: { id: true, name: true, planId: true } }),
    getUsers(),
    getCurrentPlan(),
  ]);

  return (
    <FormCard title="+ إضافة محتوى">
      <ContentForm
        plans={plans}
        campaigns={campaigns}
        users={users}
        defaults={{
          planId: planId || currentPlan?.id,
          campaignId,
          date: date ? new Date(date) : undefined,
        }}
        action={createContent}
        submitLabel="إضافة المحتوى"
      />
    </FormCard>
  );
}
