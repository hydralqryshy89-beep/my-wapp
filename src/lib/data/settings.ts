import { prisma } from "@/lib/prisma";

export async function getSettings() {
  let settings = await prisma.settings.findFirst({ orderBy: { createdAt: "asc" } });

  if (!settings) {
    settings = await prisma.settings.create({ data: { academyName: "الأكاديمية", currency: "IQD" } });
  }

  return settings;
}
