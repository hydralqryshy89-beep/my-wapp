import { notFound } from "next/navigation";
import { FormCard } from "@/components/ui/form-card";
import { TaskForm } from "@/components/forms/task-form";
import { updateTask, deleteTask } from "@/app/actions/tasks";
import { prisma } from "@/lib/prisma";
import { getCompany, getUsers } from "@/lib/data/company";
import { DeleteButton } from "@/components/ui/delete-button";
import { redirect } from "next/navigation";

async function deleteAndRedirect(id: string, formData: FormData) {
  "use server";
  await deleteTask(id, formData);
  redirect("/tasks");
}

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await getCompany();
  const [task, plans, users] = await Promise.all([
    prisma.task.findUnique({ where: { id } }),
    prisma.plan.findMany({ where: { companyId: company.id }, orderBy: { startDate: "desc" } }),
    getUsers(),
  ]);

  if (!task) notFound();

  const campaigns = await prisma.campaign.findMany({
    where: { planId: task.planId },
    select: { id: true, name: true, planId: true },
  });

  return (
    <FormCard title="تعديل المهمة">
      <div className="flex flex-col gap-5">
        <TaskForm
          plans={plans}
          campaigns={campaigns}
          users={users}
          defaults={task}
          action={updateTask.bind(null, id)}
          submitLabel="حفظ التعديلات"
        />
        <div className="border-t border-border pt-4 text-left">
          <DeleteButton action={deleteAndRedirect.bind(null, id)} label="حذف المهمة" />
        </div>
      </div>
    </FormCard>
  );
}
