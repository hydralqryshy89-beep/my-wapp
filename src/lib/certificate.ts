import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Consumes the next certificate sequence number and formats it as
 * ACD-{year}-{0000}. Must be called inside the same transaction that
 * creates the Certificate row (see app/actions/certificates.ts) so two
 * concurrent issuances never get the same number.
 */
export async function nextCertificateNumber(db: Db): Promise<string> {
  const settings = await db.settings.findFirst({ orderBy: { createdAt: "asc" } });
  if (!settings) throw new Error("لم يتم إعداد بيانات الأكاديمية بعد");

  const updated = await db.settings.update({
    where: { id: settings.id },
    data: { certificateNextSeq: { increment: 1 } },
  });

  const seq = updated.certificateNextSeq - 1;
  const year = new Date().getFullYear();
  return `ACD-${year}-${String(seq).padStart(4, "0")}`;
}
