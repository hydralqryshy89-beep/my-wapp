"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertPermission } from "@/lib/permissions";
import { REGISTRATION_STATUSES, type RegistrationStatus } from "@/lib/constants";

function str(formData: FormData, key: string): string {
  return (formData.get(key) as string | null)?.trim() ?? "";
}
function num(formData: FormData, key: string): number {
  const v = formData.get(key) as string | null;
  return v ? Number(v) : 0;
}

function revalidateAll(courseId: string, studentId: string) {
  revalidatePath("/registrations");
  revalidatePath("/dashboard");
  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/payments");
}

// Returns an error string (instead of throwing) so the validation messages
// from spec §10/§28 show verbatim to the user via useActionState.
export async function createRegistration(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await assertPermission("registrations.create");

  const studentId = str(formData, "studentId");
  const courseId = str(formData, "courseId");
  const paidAmount = Math.max(0, num(formData, "paidAmount"));
  const statusRaw = str(formData, "status");
  const status: RegistrationStatus = (REGISTRATION_STATUSES as readonly string[]).includes(statusRaw)
    ? (statusRaw as RegistrationStatus)
    : "PENDING";

  if (!studentId) return "يرجى اختيار الطالب";
  if (!courseId) return "يرجى اختيار الدورة";

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { registrations: { where: { status: { not: "CANCELLED" } } } },
  });
  if (!course || course.deletedAt) return "الدورة غير موجودة";

  if (["DRAFT", "COMPLETED", "CANCELLED"].includes(course.status)) {
    return "لا يمكن تسجيل الطالب، الدورة غير متاحة للتسجيل حالياً.";
  }

  const alreadyRegistered = course.registrations.some((r) => r.studentId === studentId);
  if (alreadyRegistered) {
    return "الطالب مسجل مسبقاً في هذه الدورة.";
  }

  if (course.registrations.length >= course.capacity) {
    return "لا يمكن تسجيل الطالب، الدورة مكتملة.";
  }

  if (paidAmount > course.price) {
    return "لا يمكن إضافة الدفعة، المبلغ أكبر من سعر الدورة.";
  }

  await prisma.$transaction(async (tx) => {
    const registration = await tx.registration.create({
      data: { studentId, courseId, price: course.price, status },
    });
    if (paidAmount > 0) {
      await tx.payment.create({
        data: { registrationId: registration.id, amount: paidAmount, method: "CASH" },
      });
    }
    // Keep the course's own status in sync with real occupancy (spec §24).
    if (course.registrations.length + 1 >= course.capacity && course.status === "OPEN") {
      await tx.course.update({ where: { id: courseId }, data: { status: "FULL" } });
    }
  });

  revalidateAll(courseId, studentId);
  redirect(`/courses/${courseId}`);
}

export async function updateRegistrationStatus(
  id: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await assertPermission("registrations.edit");
  const statusRaw = str(formData, "status");
  const status: RegistrationStatus = (REGISTRATION_STATUSES as readonly string[]).includes(statusRaw)
    ? (statusRaw as RegistrationStatus)
    : "PENDING";

  const registration = await prisma.registration.findUnique({
    where: { id },
    include: { course: { include: { registrations: { where: { status: { not: "CANCELLED" } } } } } },
  });
  if (!registration) return "التسجيل غير موجود";

  await prisma.$transaction(async (tx) => {
    await tx.registration.update({ where: { id }, data: { status } });

    // Cancelling frees a seat — reopen the course if it was marked full.
    if (status === "CANCELLED" && registration.status !== "CANCELLED" && registration.course.status === "FULL") {
      await tx.course.update({ where: { id: registration.courseId }, data: { status: "OPEN" } });
    }
  });

  revalidateAll(registration.courseId, registration.studentId);
  return undefined;
}
