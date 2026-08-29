import { prisma } from "@/lib/prisma";
import { FormCard } from "@/components/ui/form-card";
import { PaymentForm } from "@/components/forms/payment-form";
import { createPayment } from "@/app/actions/payments";
import { getSettings } from "@/lib/data/settings";
import { registrationRemaining } from "@/lib/calculations";
import { requireUser, can } from "@/lib/permissions";
import { AccessDenied } from "@/components/ui/access-denied";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ registrationId?: string; courseId?: string }>;
}) {
  const { registrationId, courseId } = await searchParams;
  const user = await requireUser();
  if (!can(user, "payments.create")) return <AccessDenied label="المدفوعات" />;

  const [registrations, settings] = await Promise.all([
    prisma.registration.findMany({
      where: { status: { not: "CANCELLED" }, ...(courseId ? { courseId } : {}) },
      include: { student: true, course: true, payments: true },
      orderBy: { createdAt: "desc" },
    }),
    getSettings(),
  ]);

  const options = registrations
    .map((r) => ({
      id: r.id,
      studentName: r.student.fullName,
      courseName: r.course.name,
      remaining: registrationRemaining(r),
    }))
    .filter((r) => r.remaining > 0);

  return (
    <FormCard title="تسجيل دفعة جديدة">
      <PaymentForm registrations={options} defaultRegistrationId={registrationId} currency={settings.currency} action={createPayment} />
    </FormCard>
  );
}
