"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function str(formData: FormData, key: string): string {
  return (formData.get(key) as string | null)?.trim() ?? "";
}
function num(formData: FormData, key: string): number {
  const v = formData.get(key) as string | null;
  return v ? Number(v) : 0;
}

function readFields(formData: FormData) {
  const campaignId = str(formData, "campaignId");
  return {
    planId: str(formData, "planId"),
    campaignId: campaignId || null,
    category: str(formData, "category"),
    description: str(formData, "description") || null,
    amount: num(formData, "amount"),
    date: new Date(str(formData, "date")),
  };
}

function revalidateAll(planId: string) {
  revalidatePath("/budget");
  revalidatePath(`/plans/${planId}`);
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
}

export async function createExpense(formData: FormData) {
  const data = readFields(formData);
  await prisma.expense.create({ data });
  revalidateAll(data.planId);
  redirect("/budget");
}

export async function updateExpense(id: string, formData: FormData) {
  const data = readFields(formData);
  await prisma.expense.update({ where: { id }, data });
  revalidateAll(data.planId);
  redirect("/budget");
}

export async function deleteExpense(id: string, _formData: FormData) {
  void _formData;
  const expense = await prisma.expense.delete({ where: { id } });
  revalidateAll(expense.planId);
}
