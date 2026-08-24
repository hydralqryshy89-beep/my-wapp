"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCompany } from "@/lib/data/company";

function str(formData: FormData, key: string): string {
  return (formData.get(key) as string | null)?.trim() ?? "";
}

function num(formData: FormData, key: string): number {
  const v = formData.get(key) as string | null;
  return v ? Number(v) : 0;
}

async function readPlanFields(formData: FormData) {
  const company = await getCompany();
  const brandId = str(formData, "brandId");
  return {
    companyId: company.id,
    brandId: brandId || null,
    name: str(formData, "name"),
    period: str(formData, "period") || null,
    startDate: new Date(str(formData, "startDate")),
    endDate: new Date(str(formData, "endDate")),
    budget: num(formData, "budget"),
    mainGoal: str(formData, "mainGoal") || null,
    description: str(formData, "description") || null,
    status: str(formData, "status") || "مخطط",
  };
}

export async function createPlan(formData: FormData) {
  const data = await readPlanFields(formData);
  const plan = await prisma.plan.create({ data });
  revalidatePath("/plans");
  revalidatePath("/dashboard");
  redirect(`/plans/${plan.id}`);
}

export async function updatePlan(id: string, formData: FormData) {
  const data = await readPlanFields(formData);
  await prisma.plan.update({ where: { id }, data });
  revalidatePath("/plans");
  revalidatePath(`/plans/${id}`);
  revalidatePath("/dashboard");
  redirect(`/plans/${id}`);
}

export async function deletePlan(id: string, _formData: FormData) {
  void _formData;
  await prisma.plan.delete({ where: { id } });
  revalidatePath("/plans");
  revalidatePath("/dashboard");
  redirect("/plans");
}
