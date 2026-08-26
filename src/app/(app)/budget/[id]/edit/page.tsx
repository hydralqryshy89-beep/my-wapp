import { notFound } from "next/navigation";
import { FormCard } from "@/components/ui/form-card";
import { ExpenseForm } from "@/components/forms/expense-form";
import { updateExpense, deleteExpense } from "@/app/actions/expenses";
import { prisma } from "@/lib/prisma";
import { getCompany } from "@/lib/data/company";
import { DeleteButton } from "@/components/ui/delete-button";
import { redirect } from "next/navigation";
import { requireUser, can } from "@/lib/permissions";
import { AccessDenied } from "@/components/ui/access-denied";

async function deleteAndRedirect(id: string, formData: FormData) {
  "use server";
  void formData;
  await deleteExpense(id, formData);
  redirect("/budget");
}

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!can(user, "budget", "EDIT")) return <AccessDenied label="الميزانية" />;
  const company = await getCompany();
  const [expense, plans] = await Promise.all([
    prisma.expense.findUnique({ where: { id } }),
    prisma.plan.findMany({ where: { companyId: company.id }, orderBy: { startDate: "desc" } }),
  ]);

  if (!expense) notFound();

  const campaigns = await prisma.campaign.findMany({
    where: { planId: expense.planId },
    select: { id: true, name: true, planId: true },
  });

  return (
    <FormCard title="تعديل المصروف">
      <div className="flex flex-col gap-5">
        <ExpenseForm
          plans={plans}
          campaigns={campaigns}
          defaults={expense}
          action={updateExpense.bind(null, id)}
          submitLabel="حفظ التعديلات"
        />
        <div className="border-t border-border pt-4 text-left">
          <DeleteButton action={deleteAndRedirect.bind(null, id)} label="حذف المصروف" />
        </div>
      </div>
    </FormCard>
  );
}
