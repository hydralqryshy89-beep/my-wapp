import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FormCard } from "@/components/ui/form-card";
import { StudentForm } from "@/components/forms/student-form";
import { updateStudent } from "@/app/actions/students";
import { requireUser, can } from "@/lib/permissions";
import { AccessDenied } from "@/components/ui/access-denied";

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!can(user, "students.edit")) return <AccessDenied label="الطلاب" />;

  const student = await prisma.student.findUnique({ where: { id } });
  if (!student || student.deletedAt) notFound();

  return (
    <FormCard title={`تعديل بيانات: ${student.fullName}`}>
      <StudentForm action={updateStudent.bind(null, student.id)} defaults={student} submitLabel="حفظ التعديلات" />
    </FormCard>
  );
}
