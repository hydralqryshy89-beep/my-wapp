"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function str(formData: FormData, key: string): string {
  return (formData.get(key) as string | null)?.trim() ?? "";
}

function readFields(formData: FormData) {
  const campaignId = str(formData, "campaignId");
  const assignedToId = str(formData, "assignedToId");
  const dueDate = str(formData, "dueDate");
  return {
    planId: str(formData, "planId"),
    campaignId: campaignId || null,
    title: str(formData, "title"),
    description: str(formData, "description") || null,
    assignedToId: assignedToId || null,
    priority: str(formData, "priority") || "متوسطة",
    status: str(formData, "status") || "جديدة",
    dueDate: dueDate ? new Date(dueDate) : null,
  };
}

function revalidateAll(planId: string) {
  revalidatePath("/tasks");
  revalidatePath(`/plans/${planId}`);
  revalidatePath("/dashboard");
}

export async function createTask(formData: FormData) {
  const data = readFields(formData);
  await prisma.task.create({ data });
  revalidateAll(data.planId);
  redirect("/tasks");
}

export async function updateTask(id: string, formData: FormData) {
  const data = readFields(formData);
  await prisma.task.update({ where: { id }, data });
  revalidateAll(data.planId);
  redirect("/tasks");
}

export async function deleteTask(id: string, _formData: FormData) {
  void _formData;
  const task = await prisma.task.delete({ where: { id } });
  revalidateAll(task.planId);
}

export async function updateTaskStatus(id: string, status: string, _formData: FormData) {
  void _formData;
  const task = await prisma.task.update({ where: { id }, data: { status } });
  revalidateAll(task.planId);
}
