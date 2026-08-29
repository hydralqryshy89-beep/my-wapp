"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertPermission } from "@/lib/permissions";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/constants";
import { registrationRemaining } from "@/lib/calculations";

function str(formData: FormData, key: string): string {
  return (formData.get(key) as string | null)?.trim() ?? "";
}
function num(formData: FormData, key: string): number {
  const v = formData.get(key) as string | null;
  return v ? Number(v) : 0;
}

// Returns an error string (instead of throwing) so the validation message
// from spec §11/§28 ("لا يمكن إضافة الدفعة، المبلغ أكبر من المتبقي") shows verbatim.
export async function createPayment(_prevState: string | undefined, formData: FormData): Promise<string | undefined> {
  await assertPermission("payments.create");

  const registrationId = str(formData, "registrationId");
  const amount = num(formData, "amount");
  const paymentDate = str(formData, "paymentDate");
  const methodRaw = str(formData, "method");
  const method: PaymentMethod = (PAYMENT_METHODS as readonly string[]).includes(methodRaw)
    ? (methodRaw as PaymentMethod)
    : "CASH";
  const notes = str(formData, "notes") || null;

  if (!registrationId) return "يرجى اختيار تسجيل الطالب";
  if (!amount || amount <= 0) return "يرجى إدخال مبلغ صحيح";

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { payments: true },
  });
  if (!registration) return "التسجيل غير موجود";

  const remaining = registrationRemaining(registration);
  if (amount > remaining) {
    return "لا يمكن إضافة الدفعة، المبلغ أكبر من المتبقي.";
  }

  const payment = await prisma.payment.create({
    data: {
      registrationId,
      amount,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      method,
      notes,
    },
  });
  void payment;

  revalidatePath("/payments");
  revalidatePath("/registrations");
  revalidatePath("/dashboard");
  revalidatePath(`/courses/${registration.courseId}`);
  revalidatePath(`/students/${registration.studentId}`);
  redirect(`/payments?courseId=${registration.courseId}`);
}
