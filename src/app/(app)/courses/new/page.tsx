import { prisma } from "@/lib/prisma";
import { FormCard } from "@/components/ui/form-card";
import { CourseForm } from "@/components/forms/course-form";
import { createCourse } from "@/app/actions/courses";
import { requireUser, can } from "@/lib/permissions";
import { AccessDenied } from "@/components/ui/access-denied";

export default async function NewCoursePage() {
  const user = await requireUser();
  if (!can(user, "courses.manage")) return <AccessDenied label="الدورات" />;

  const instructors = await prisma.instructor.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } });

  return (
    <FormCard title="إضافة دورة جديدة">
      <CourseForm instructors={instructors} action={createCourse} submitLabel="حفظ الدورة" />
    </FormCard>
  );
}
