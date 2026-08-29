import { prisma } from "@/lib/prisma";
import { FormCard } from "@/components/ui/form-card";
import { RegistrationForm } from "@/components/forms/registration-form";
import { createRegistration } from "@/app/actions/registrations";
import { getSettings } from "@/lib/data/settings";
import { requireUser, can } from "@/lib/permissions";
import { AccessDenied } from "@/components/ui/access-denied";

export default async function NewRegistrationPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string; studentId?: string }>;
}) {
  const { courseId, studentId } = await searchParams;
  const user = await requireUser();
  if (!can(user, "registrations.create")) return <AccessDenied label="التسجيلات" />;

  const [students, courses, settings] = await Promise.all([
    prisma.student.findMany({ where: { deletedAt: null }, orderBy: { fullName: "asc" } }),
    prisma.course.findMany({
      where: { deletedAt: null, status: { in: ["OPEN", "FULL"] } },
      include: { registrations: { where: { status: { not: "CANCELLED" } } } },
      orderBy: { startDate: "asc" },
    }),
    getSettings(),
  ]);

  const courseOptions = courses.map((c) => ({
    id: c.id,
    name: c.name,
    price: c.price,
    capacity: c.capacity,
    activeCount: c.registrations.length,
  }));

  return (
    <FormCard title="تسجيل طالب في دورة">
      <RegistrationForm
        students={students}
        courses={courseOptions}
        defaultStudentId={studentId}
        defaultCourseId={courseId}
        currency={settings.currency}
        action={createRegistration}
      />
    </FormCard>
  );
}
