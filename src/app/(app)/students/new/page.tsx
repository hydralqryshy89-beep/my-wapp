import { FormCard } from "@/components/ui/form-card";
import { StudentForm } from "@/components/forms/student-form";
import { createStudent } from "@/app/actions/students";
import { requireUser, can } from "@/lib/permissions";
import { AccessDenied } from "@/components/ui/access-denied";

export default async function NewStudentPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const { courseId } = await searchParams;
  const user = await requireUser();
  if (!can(user, "students.create")) return <AccessDenied label="الطلاب" />;

  return (
    <FormCard title="إضافة طالب جديد">
      <StudentForm action={createStudent} submitLabel="حفظ" registerCourseId={courseId} />
    </FormCard>
  );
}
