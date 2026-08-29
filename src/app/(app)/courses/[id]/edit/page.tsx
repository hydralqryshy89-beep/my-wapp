import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FormCard } from "@/components/ui/form-card";
import { CourseForm } from "@/components/forms/course-form";
import { updateCourse } from "@/app/actions/courses";
import { requireUser, can } from "@/lib/permissions";
import { AccessDenied } from "@/components/ui/access-denied";

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!can(user, "courses.manage")) return <AccessDenied label="الدورات" />;

  const [course, instructors] = await Promise.all([
    prisma.course.findUnique({ where: { id } }),
    prisma.instructor.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } }),
  ]);
  if (!course || course.deletedAt) notFound();

  return (
    <FormCard title={`تعديل: ${course.name}`}>
      <CourseForm instructors={instructors} defaults={course} action={updateCourse.bind(null, course.id)} submitLabel="حفظ التعديلات" />
    </FormCard>
  );
}
