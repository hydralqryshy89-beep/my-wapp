"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertPermission } from "@/lib/permissions";

function str(formData: FormData, key: string): string {
  return (formData.get(key) as string | null)?.trim() ?? "";
}

function readFields(formData: FormData) {
  return {
    fullName: str(formData, "fullName"),
    phone: str(formData, "phone"),
    whatsapp: str(formData, "whatsapp") || null,
    email: str(formData, "email") || null,
    profession: str(formData, "profession") || null,
    specialty: str(formData, "specialty") || null,
    workplace: str(formData, "workplace") || null,
    notes: str(formData, "notes") || null,
  };
}

// Returns an error string (instead of throwing) so the required-field
// message shows verbatim to the user — see spec §28 and src/app/actions/settings.ts.
export async function createStudent(_prevState: string | undefined, formData: FormData): Promise<string | undefined> {
  await assertPermission("students.create");
  const data = readFields(formData);
  if (!data.fullName) return "يرجى إدخال اسم الطالب";
  if (!data.phone) return "يرجى إدخال رقم هاتف الطالب";

  const student = await prisma.student.create({ data });
  revalidatePath("/students");
  revalidatePath("/dashboard");

  const registerAfter = str(formData, "registerCourseId");
  redirect(registerAfter ? `/registrations/new?courseId=${registerAfter}&studentId=${student.id}` : `/students/${student.id}`);
}

export async function updateStudent(
  id: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  await assertPermission("students.edit");
  const data = readFields(formData);
  if (!data.fullName) return "يرجى إدخال اسم الطالب";
  if (!data.phone) return "يرجى إدخال رقم هاتف الطالب";

  await prisma.student.update({ where: { id }, data });
  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
  redirect(`/students/${id}`);
}

export async function deleteStudent(id: string, _formData: FormData) {
  void _formData;
  await assertPermission("students.delete");
  await prisma.student.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidatePath("/students");
  revalidatePath("/dashboard");
  redirect("/students");
}
