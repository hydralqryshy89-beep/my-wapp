import { prisma } from "@/lib/prisma";
import { registrationPaid, registrationRemaining, remainingSeats } from "@/lib/calculations";
import { formatCurrency } from "@/lib/format";
import { getSettings } from "@/lib/data/settings";

export async function getDashboardData() {
  const now = new Date();
  const soon = new Date(now.getTime() + 7 * 86_400_000);

  const [upcomingCoursesCount, studentsCount, registrationsCount, allActiveRegistrations, upcomingCourses, recentRegistrations] =
    await Promise.all([
      prisma.course.count({ where: { deletedAt: null, startDate: { gte: now }, status: { notIn: ["CANCELLED"] } } }),
      prisma.student.count({ where: { deletedAt: null } }),
      prisma.registration.count({ where: { status: { not: "CANCELLED" } } }),
      prisma.registration.findMany({ where: { status: { not: "CANCELLED" } }, include: { payments: true } }),
      prisma.course.findMany({
        where: { deletedAt: null, startDate: { gte: now }, status: { notIn: ["CANCELLED"] } },
        include: { instructor: true, registrations: { where: { status: { not: "CANCELLED" } } } },
        orderBy: { startDate: "asc" },
        take: 5,
      }),
      prisma.registration.findMany({
        include: { student: true, course: true, payments: true },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
    ]);

  const totalPaid = allActiveRegistrations.reduce((sum, r) => sum + registrationPaid(r), 0);
  const totalRemaining = allActiveRegistrations.reduce((sum, r) => sum + registrationRemaining(r), 0);

  const alerts: { type: "soon" | "seats" | "remaining"; message: string }[] = [];
  for (const c of upcomingCourses) {
    if (c.startDate <= soon) {
      alerts.push({ type: "soon", message: `دورة «${c.name}» تبدأ قريباً (${c.startDate.toLocaleDateString("ar-u-nu-latn")})` });
    }
    const seatsLeft = remainingSeats(c.capacity, c.registrations.length);
    if (c.capacity > 0 && seatsLeft <= Math.max(1, Math.ceil(c.capacity * 0.1))) {
      alerts.push({ type: "seats", message: `دورة «${c.name}» تبقى فيها ${seatsLeft} مقعد فقط` });
    }
  }
  if (totalRemaining > 0) {
    const settings = await getSettings();
    alerts.push({
      type: "remaining",
      message: `يوجد مبالغ متبقية على الطلاب بقيمة إجمالية ${formatCurrency(totalRemaining, settings.currency)}`,
    });
  }

  return {
    upcomingCoursesCount,
    studentsCount,
    registrationsCount,
    totalPaid,
    totalRemaining,
    upcomingCourses: upcomingCourses.map((c) => ({
      id: c.id,
      name: c.name,
      startDate: c.startDate,
      instructorName: c.instructor?.name ?? null,
      registeredCount: c.registrations.length,
      seatsLeft: remainingSeats(c.capacity, c.registrations.length),
      status: c.status,
    })),
    recentRegistrations: recentRegistrations.map((r) => ({
      id: r.id,
      studentName: r.student.fullName,
      courseName: r.course.name,
      price: r.price,
      remaining: registrationRemaining(r),
      createdAt: r.createdAt,
    })),
    alerts: alerts.slice(0, 6),
  };
}
