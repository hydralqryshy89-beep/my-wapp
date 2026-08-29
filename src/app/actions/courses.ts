"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertPermission } from "@/lib/permissions";
import { COURSE_STATUSES, type CourseStatus } from "@/lib/constants";

function str(formData: FormData, key: string): string {
  return (formData.get(key) as string | null)?.trim() ?? "";
}
function num(formData: FormData, key: string): number {
  const v = formData.get(key) as string | null;
  return v ? Number(v) : 0;
}

function readFields(formData: FormData) {
  const instructorId = str(formData, "instructorId");
  const status = str(formData, "status");
  return {
    name: str(formData, "name"),
    shortDescription: str(formData, "shortDescription") || null,
    category: str(formData, "category") || null,
    instructorId: instructorId || null,
    startDate: new Date(str(formData, "startDate")),
    endDate: new Date(str(formData, "endDate")),
    days: Math.max(1, num(formData, "days") || 1),
    price: Math.max(0, num(formData, "price")),
    capacity: Math.max(0, num(formData, "capacity")),
    room: str(formData, "room") || null,
    status: (COURSE_STATUSES as readonly string[]).includes(status) ? (status as CourseStatus) : "DRAFT",
  };
}

function revalidateAll(courseId?: string) {
  revalidatePath("/courses");
  revalidatePath("/dashboard");
  if (courseId) revalidatePath(`/courses/${courseId}`);
}

export async function createCourse(formData: FormData) {
  await assertPermission("courses.manage");
  const data = readFields(formData);
  const course = await prisma.course.create({ data });
  revalidateAll(course.id);
  redirect(`/courses/${course.id}`);
}

export async function updateCourse(id: string, formData: FormData) {
  await assertPermission("courses.manage");
  const data = readFields(formData);
  await prisma.course.update({ where: { id }, data });
  revalidateAll(id);
  redirect(`/courses/${id}`);
}

export async function deleteCourse(id: string, _formData: FormData) {
  void _formData;
  await assertPermission("courses.manage");
  await prisma.course.update({ where: { id }, data: { deletedAt: new Date() } });
  revalidateAll();
  redirect("/courses");
}
