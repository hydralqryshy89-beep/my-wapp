"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/permissions";
import { ATTENDANCE_STATUSES, type AttendanceStatus } from "@/lib/constants";

export async function markAttendance(
  registrationId: string,
  dayNumber: number,
  courseId: string,
  formData: FormData
) {
  await assertPermission("attendance.mark");
  const statusRaw = formData.get("status") as string | null;
  const status: AttendanceStatus = (ATTENDANCE_STATUSES as readonly string[]).includes(statusRaw ?? "")
    ? (statusRaw as AttendanceStatus)
    : "ABSENT";

  await prisma.attendance.upsert({
    where: { registrationId_dayNumber: { registrationId, dayNumber } },
    update: { status },
    create: { registrationId, dayNumber, status },
  });

  revalidatePath(`/attendance/${courseId}`);
  revalidatePath(`/courses/${courseId}`);
}
