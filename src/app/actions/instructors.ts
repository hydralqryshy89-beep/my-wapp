"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { assertPermission } from "@/lib/permissions";

function str(formData: FormData, key: string): string {
  return (formData.get(key) as string | null)?.trim() ?? "";
}

export async function createInstructor(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await assertPermission("courses.manage");
  const name = str(formData, "name");
  if (!name) return "يرجى إدخال اسم المدرب";

  await prisma.instructor.create({
    data: {
      name,
      phone: str(formData, "phone") || null,
      specialty: str(formData, "specialty") || null,
      notes: str(formData, "notes") || null,
    },
  });
  revalidatePath("/courses");
  return undefined;
}

export async function updateInstructor(
  id: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await assertPermission("courses.manage");
  const name = str(formData, "name");
  if (!name) return "يرجى إدخال اسم المدرب";

  await prisma.instructor.update({
    where: { id },
    data: {
      name,
      phone: str(formData, "phone") || null,
      specialty: str(formData, "specialty") || null,
      notes: str(formData, "notes") || null,
    },
  });
  revalidatePath("/courses");
  return undefined;
}

export async function deleteInstructor(id: string, _formData: FormData) {
  void _formData;
  await assertPermission("courses.manage");
  await prisma.instructor.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/courses");
}
