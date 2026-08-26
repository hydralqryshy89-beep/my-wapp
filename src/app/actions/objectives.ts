"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertPermission } from "@/lib/permissions";

function str(formData: FormData, key: string): string {
  return (formData.get(key) as string | null)?.trim() ?? "";
}
function num(formData: FormData, key: string): number {
  const v = formData.get(key) as string | null;
  return v ? Number(v) : 0;
}

function readFields(formData: FormData) {
  return {
    planId: str(formData, "planId"),
    name: str(formData, "name"),
    description: str(formData, "description") || null,
    kpiType: str(formData, "kpiType"),
    target: num(formData, "target"),
    current: num(formData, "current"),
    unit: str(formData, "unit") || null,
  };
}

function revalidateAll(planId: string) {
  revalidatePath("/objectives");
  revalidatePath(`/plans/${planId}`);
  revalidatePath("/dashboard");
}

export async function createObjective(formData: FormData) {
  await assertPermission("objectives", "EDIT");
  const data = readFields(formData);
  await prisma.objective.create({ data });
  revalidateAll(data.planId);
  redirect(`/plans/${data.planId}?tab=objectives`);
}

export async function updateObjective(id: string, formData: FormData) {
  await assertPermission("objectives", "EDIT");
  const data = readFields(formData);
  await prisma.objective.update({ where: { id }, data });
  revalidateAll(data.planId);
  redirect(`/plans/${data.planId}?tab=objectives`);
}

export async function deleteObjective(id: string, _formData: FormData) {
  void _formData;
  await assertPermission("objectives", "EDIT");
  const obj = await prisma.objective.delete({ where: { id } });
  revalidateAll(obj.planId);
  redirect(`/plans/${obj.planId}?tab=objectives`);
}

export async function deleteObjectiveFromList(id: string, _formData: FormData) {
  void _formData;
  await assertPermission("objectives", "EDIT");
  await prisma.objective.delete({ where: { id } });
  revalidatePath("/objectives");
  revalidatePath("/dashboard");
}
