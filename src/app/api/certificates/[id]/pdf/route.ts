import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { getSettings } from "@/lib/data/settings";
import { formatDate } from "@/lib/format";
import { buildCertificatePdf } from "@/lib/pdf/certificate";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const [certificate, settings] = await Promise.all([
    prisma.certificate.findUnique({
      where: { id },
      include: { registration: { include: { student: true, course: { include: { instructor: true } } } } },
    }),
    getSettings(),
  ]);

  if (!certificate) {
    return NextResponse.json({ error: "الشهادة غير موجودة" }, { status: 404 });
  }

  const { registration } = certificate;
  const pdf = await buildCertificatePdf({
    academyName: settings.academyName,
    academyLogo: settings.logo,
    studentName: registration.student.fullName,
    courseName: registration.course.name,
    instructorName: registration.course.instructor?.name,
    courseDateRange: `${formatDate(registration.course.startDate)} — ${formatDate(registration.course.endDate)}`,
    certificateNumber: certificate.certificateNumber,
    issueDate: formatDate(certificate.issueDate),
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${certificate.certificateNumber}.pdf"`,
    },
  });
}
