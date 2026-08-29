import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

function hash(password: string) {
  return bcrypt.hash(password, 10);
}

function daysFrom(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  console.log("Seeding academy data...");
  const today = new Date();

  // Wipe in child-to-parent order (Payment/Attendance/Certificate cascade
  // from Registration; Registration itself must go before Course/Student).
  await prisma.registration.deleteMany();
  await prisma.course.deleteMany();
  await prisma.instructor.deleteMany();
  await prisma.student.deleteMany();
  await prisma.user.deleteMany();
  await prisma.settings.deleteMany();

  // --- Settings -----------------------------------------------------------
  const settings = await prisma.settings.create({
    data: {
      academyName: "أكاديمية الرافدين لطب الأسنان",
      phone: "07701234567",
      email: "info@rafidain-academy.example",
      address: "بغداد — شارع فلسطين",
      instagram: "rafidain.academy",
      facebook: "rafidain.academy",
      currency: "IQD",
      certificateNextSeq: 1,
    },
  });

  // --- Users ---------------------------------------------------------------
  await prisma.user.create({
    data: { name: "مدير النظام", email: "admin@academy.com", role: "ADMIN", passwordHash: await hash("password123") },
  });
  await prisma.user.create({
    data: { name: "موظفة الاستقبال", email: "staff@academy.com", role: "STAFF", passwordHash: await hash("password123") },
  });

  // --- Instructors -----------------------------------------------------------
  const drSara = await prisma.instructor.create({
    data: { name: "د. سارة خالد", phone: "07711112222", specialty: "زراعة الأسنان" },
  });
  const drOmar = await prisma.instructor.create({
    data: { name: "د. عمر ياسين", phone: "07733334444", specialty: "طب الأسنان التجميلي" },
  });
  const drLina = await prisma.instructor.create({
    data: { name: "د. لينا عبد الرزاق", phone: "07755556666", specialty: "الإسعافات الأولية والإنعاش" },
  });

  // --- Courses ---------------------------------------------------------------
  const courseCompleted = await prisma.course.create({
    data: {
      name: "دورة زراعة الأسنان المتقدمة",
      shortDescription: "دورة عملية متقدمة في زراعة الأسنان باستخدام أحدث التقنيات.",
      category: "طب الأسنان",
      instructorId: drSara.id,
      startDate: daysFrom(today, -28),
      endDate: daysFrom(today, -24),
      days: 5,
      price: 500_000,
      capacity: 12,
      room: "مركز الأسنان — الطابق الثاني",
      status: "COMPLETED",
    },
  });
  const courseUpcoming = await prisma.course.create({
    data: {
      name: "دورة الإسعافات الأولية والإنعاش القلبي الرئوي",
      shortDescription: "دورة حضورية في أساسيات الإسعافات الأولية والإنعاش القلبي الرئوي (BLS).",
      category: "طب عام",
      instructorId: drLina.id,
      startDate: daysFrom(today, 12),
      endDate: daysFrom(today, 13),
      days: 2,
      price: 150_000,
      capacity: 20,
      room: "القاعة التدريبية أ",
      status: "OPEN",
    },
  });
  const courseAlmostFull = await prisma.course.create({
    data: {
      name: "دورة تبييض الأسنان بالليزر",
      shortDescription: "دورة عملية في أحدث تقنيات تبييض الأسنان بالليزر.",
      category: "طب الأسنان",
      instructorId: drOmar.id,
      startDate: daysFrom(today, 22),
      endDate: daysFrom(today, 22),
      days: 1,
      price: 250_000,
      capacity: 5,
      room: "مركز الأسنان — الطابق الثاني",
      status: "OPEN",
    },
  });

  // --- Students ---------------------------------------------------------------
  const studentsData = [
    { fullName: "أحمد محمد علي", phone: "07801111111", profession: "طبيب أسنان", workplace: "مستشفى بغداد التعليمي" },
    { fullName: "زينب حسين كاظم", phone: "07801111112", profession: "طبيبة أسنان", workplace: "عيادة خاصة" },
    { fullName: "مصطفى عبد الله", phone: "07801111113", profession: "طبيب", workplace: "مستشفى اليرموك" },
    { fullName: "نور الهدى جاسم", phone: "07801111114", profession: "صيدلانية", workplace: "صيدلية النور" },
    { fullName: "علي حسن كريم", phone: "07801111115", profession: "ممرض", workplace: "مستشفى الكرخ" },
    { fullName: "مريم صادق عبود", phone: "07801111116", profession: "طبيبة أسنان", workplace: "عيادة الابتسامة" },
    { fullName: "حيدر رياض شاكر", phone: "07801111117", profession: "طالب", workplace: "كلية طب الأسنان — جامعة بغداد" },
    { fullName: "رقية فاضل عودة", phone: "07801111118", profession: "ممرضة", workplace: "مستشفى ابن سينا" },
    { fullName: "سيف الدين ماجد", phone: "07801111119", profession: "طبيب أسنان", workplace: "عيادة خاصة" },
    { fullName: "دعاء كاظم حمزة", phone: "07801111120", profession: "طبيبة", workplace: "مستشفى الشيخ زايد" },
  ];
  const students = [];
  for (const s of studentsData) {
    students.push(await prisma.student.create({ data: s }));
  }

  // --- Registrations + Payments + Attendance + Certificates -------------------

  // Course A (completed): register students 0-4, full history.
  const completedRegs = [];
  for (let i = 0; i < 5; i++) {
    const reg = await prisma.registration.create({
      data: {
        studentId: students[i].id,
        courseId: courseCompleted.id,
        price: courseCompleted.price,
        status: "COMPLETED",
      },
    });
    completedRegs.push(reg);

    // First 3 paid in full (in two installments), last 2 partially paid.
    if (i < 3) {
      await prisma.payment.create({
        data: { registrationId: reg.id, amount: 300_000, method: "CASH", paymentDate: daysFrom(today, -30) },
      });
      await prisma.payment.create({
        data: { registrationId: reg.id, amount: 200_000, method: "BANK_TRANSFER", paymentDate: daysFrom(today, -26) },
      });
    } else {
      await prisma.payment.create({
        data: { registrationId: reg.id, amount: 250_000, method: "CASH", paymentDate: daysFrom(today, -29) },
      });
    }

    // Attendance across all 5 days — mostly present, one absence for variety.
    for (let day = 1; day <= courseCompleted.days; day++) {
      await prisma.attendance.create({
        data: { registrationId: reg.id, dayNumber: day, status: i === 4 && day === 3 ? "ABSENT" : "PRESENT" },
      });
    }
  }

  // Issue certificates for the 3 fully-paid students.
  for (let i = 0; i < 3; i++) {
    const year = new Date().getFullYear();
    const updated = await prisma.settings.update({
      where: { id: settings.id },
      data: { certificateNextSeq: { increment: 1 } },
    });
    const seq = updated.certificateNextSeq - 1;
    await prisma.certificate.create({
      data: {
        registrationId: completedRegs[i].id,
        certificateNumber: `ACD-${year}-${String(seq).padStart(4, "0")}`,
      },
    });
  }

  // Course B (upcoming): register students 5-8, mixed payment/status.
  const upcomingPairs: [number, number, "PENDING" | "CONFIRMED"][] = [
    [5, 150_000, "CONFIRMED"],
    [6, 75_000, "CONFIRMED"],
    [7, 0, "PENDING"],
    [8, 150_000, "CONFIRMED"],
  ];
  for (const [studentIdx, paid, status] of upcomingPairs) {
    const reg = await prisma.registration.create({
      data: { studentId: students[studentIdx].id, courseId: courseUpcoming.id, price: courseUpcoming.price, status },
    });
    if (paid > 0) {
      await prisma.payment.create({ data: { registrationId: reg.id, amount: paid, method: "CASH" } });
    }
  }

  // Course C (almost full, capacity 5): register 4 students to leave 1 seat.
  for (let i = 0; i < 4; i++) {
    const reg = await prisma.registration.create({
      data: { studentId: students[i].id, courseId: courseAlmostFull.id, price: courseAlmostFull.price, status: "CONFIRMED" },
    });
    await prisma.payment.create({ data: { registrationId: reg.id, amount: 100_000, method: "CASH" } });
  }

  console.log("Seed complete.");
  console.log("Admin login: admin@academy.com / password123");
  console.log("Staff login: staff@academy.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
