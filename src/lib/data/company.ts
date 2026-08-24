import { prisma } from "@/lib/prisma";

export async function getCompany() {
  let company = await prisma.company.findFirst({
    include: { brands: { orderBy: { name: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  if (!company) {
    company = await prisma.company.create({
      data: { name: "الشركة", currency: "IQD", language: "ar" },
      include: { brands: true },
    });
  }

  return company;
}

export async function getUsers() {
  return prisma.user.findMany({ orderBy: { name: "asc" } });
}
