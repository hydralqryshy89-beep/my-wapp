"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/permissions";
import { nextCertificateNumber } from "@/lib/certificate";

// Returns an error string (instead of throwing) so the validation message
// shows verbatim to the user — see spec §28 and src/app/actions/settings.ts.
export async function issueCertificate(
  registrationId: string,
  _prevState: string | undefined,
  _formData: FormData
): Promise<string | undefined> {
  void _formData;
  await assertPermission("certificates.issue");

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { course: true, certificate: true },
  });
  if (!registration) return "التسجيل غير موجود";
  if (registration.certificate) return "تم إصدار شهادة لهذا الطالب مسبقاً";

  const courseFinished = registration.course.status === "COMPLETED" || registration.course.endDate < new Date();
  if (!courseFinished) {
    return "لا يمكن إصدار الشهادة قبل انتهاء الدورة.";
  }

  await prisma.$transaction(async (tx) => {
    const certificateNumber = await nextCertificateNumber(tx);
    await tx.certificate.create({
      data: { registrationId, certificateNumber },
    });
  });

  revalidatePath("/certificates");
  revalidatePath(`/courses/${registration.courseId}`);
  revalidatePath(`/students/${registration.studentId}`);
  return undefined;
}
