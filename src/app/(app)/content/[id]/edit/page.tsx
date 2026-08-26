import { notFound } from "next/navigation";
import { FormCard } from "@/components/ui/form-card";
import { ContentForm } from "@/components/forms/content-form";
import { updateContent, deleteContent } from "@/app/actions/content";
import { prisma } from "@/lib/prisma";
import { getCompany, getUsers } from "@/lib/data/company";
import { DeleteButton } from "@/components/ui/delete-button";
import { requireUser, can } from "@/lib/permissions";
import { AccessDenied } from "@/components/ui/access-denied";

export default async function EditContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!can(user, "content", "EDIT")) return <AccessDenied label="تقويم المحتوى" />;
  const company = await getCompany();
  const [content, plans, campaigns, users] = await Promise.all([
    prisma.content.findUnique({ where: { id } }),
    prisma.plan.findMany({ where: { companyId: company.id }, orderBy: { startDate: "desc" } }),
    prisma.campaign.findMany({ where: { plan: { companyId: company.id } }, select: { id: true, name: true, planId: true } }),
    getUsers(),
  ]);

  if (!content) notFound();

  return (
    <FormCard title="تعديل المحتوى">
      <div className="flex flex-col gap-5">
        <ContentForm
          plans={plans}
          campaigns={campaigns}
          users={users}
          defaults={content}
          action={updateContent.bind(null, id)}
          submitLabel="حفظ التعديلات"
        />
        <div className="border-t border-border pt-4 text-left">
          <DeleteButton action={deleteContent.bind(null, id)} label="حذف المحتوى" />
        </div>
      </div>
    </FormCard>
  );
}
