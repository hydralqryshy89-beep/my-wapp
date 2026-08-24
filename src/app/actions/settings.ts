"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function str(formData: FormData, key: string): string {
  return (formData.get(key) as string | null)?.trim() ?? "";
}

export async function updateCompany(id: string, formData: FormData) {
  await prisma.company.update({
    where: { id },
    data: {
      name: str(formData, "name"),
      logo: str(formData, "logo") || null,
      currency: str(formData, "currency") || "IQD",
      language: str(formData, "language") || "ar",
    },
  });
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

export async function createBrand(companyId: string, formData: FormData) {
  await prisma.brand.create({
    data: {
      companyId,
      name: str(formData, "name"),
      logo: str(formData, "logo") || null,
    },
  });
  revalidatePath("/settings");
}

export async function updateBrand(id: string, formData: FormData) {
  await prisma.brand.update({
    where: { id },
    data: {
      name: str(formData, "name"),
      logo: str(formData, "logo") || null,
    },
  });
  revalidatePath("/settings");
}

export async function deleteBrand(id: string, _formData: FormData) {
  void _formData;
  await prisma.brand.delete({ where: { id } });
  revalidatePath("/settings");
}

export async function createUser(companyId: string, formData: FormData) {
  await prisma.user.create({
    data: {
      companyId,
      name: str(formData, "name"),
      email: str(formData, "email"),
      role: str(formData, "role") || null,
    },
  });
  revalidatePath("/settings");
}

export async function updateUser(id: string, formData: FormData) {
  await prisma.user.update({
    where: { id },
    data: {
      name: str(formData, "name"),
      email: str(formData, "email"),
      role: str(formData, "role") || null,
    },
  });
  revalidatePath("/settings");
}

export async function deleteUser(id: string, _formData: FormData) {
  void _formData;
  await prisma.user.delete({ where: { id } });
  revalidatePath("/settings");
}
