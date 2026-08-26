"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertPermission } from "@/lib/permissions";

function str(formData: FormData, key: string): string {
  return (formData.get(key) as string | null)?.trim() ?? "";
}

function readFields(formData: FormData) {
  const campaignId = str(formData, "campaignId");
  const assignedToId = str(formData, "assignedToId");
  return {
    planId: str(formData, "planId"),
    campaignId: campaignId || null,
    title: str(formData, "title"),
    type: str(formData, "type"),
    platform: str(formData, "platform"),
    date: new Date(str(formData, "date")),
    assignedToId: assignedToId || null,
    status: str(formData, "status") || "فكرة",
  };
}

function revalidateAll(planId: string) {
  revalidatePath("/content");
  revalidatePath(`/plans/${planId}`);
  revalidatePath("/dashboard");
}

export async function createContent(formData: FormData) {
  await assertPermission("content", "EDIT");
  const data = readFields(formData);
  await prisma.content.create({ data });
  revalidateAll(data.planId);
  redirect("/content");
}

export async function updateContent(id: string, formData: FormData) {
  await assertPermission("content", "EDIT");
  const data = readFields(formData);
  await prisma.content.update({ where: { id }, data });
  revalidateAll(data.planId);
  redirect("/content");
}

export async function deleteContent(id: string, _formData: FormData) {
  void _formData;
  await assertPermission("content", "EDIT");
  const content = await prisma.content.delete({ where: { id } });
  revalidateAll(content.planId);
  redirect("/content");
}
