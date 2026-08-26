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
  const platforms = formData.getAll("platforms") as string[];
  const brandId = str(formData, "brandId");
  const assignedToId = str(formData, "assignedToId");
  return {
    planId: str(formData, "planId"),
    brandId: brandId || null,
    name: str(formData, "name"),
    objective: str(formData, "objective") || null,
    startDate: new Date(str(formData, "startDate")),
    endDate: new Date(str(formData, "endDate")),
    budget: num(formData, "budget"),
    platforms: platforms.join(","),
    audience: str(formData, "audience") || null,
    assignedToId: assignedToId || null,
    status: str(formData, "status") || "مخطط",
  };
}

function revalidateAll(planId: string, campaignId?: string) {
  revalidatePath("/campaigns");
  revalidatePath(`/plans/${planId}`);
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  if (campaignId) revalidatePath(`/campaigns/${campaignId}`);
}

export async function createCampaign(formData: FormData) {
  await assertPermission("campaigns", "EDIT");
  const data = readFields(formData);
  const campaign = await prisma.campaign.create({ data });
  revalidateAll(data.planId, campaign.id);
  redirect(`/campaigns/${campaign.id}`);
}

export async function updateCampaign(id: string, formData: FormData) {
  await assertPermission("campaigns", "EDIT");
  const data = readFields(formData);
  await prisma.campaign.update({ where: { id }, data });
  revalidateAll(data.planId, id);
  redirect(`/campaigns/${id}`);
}

export async function deleteCampaign(id: string, _formData: FormData) {
  void _formData;
  await assertPermission("campaigns", "EDIT");
  const campaign = await prisma.campaign.delete({ where: { id } });
  revalidateAll(campaign.planId);
  redirect("/campaigns");
}
