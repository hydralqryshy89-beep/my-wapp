import { redirect } from "next/navigation";
import { getCurrentSaasUser } from "@/lib/saas/current-user";

export default async function SaasHome() {
  const user = await getCurrentSaasUser();
  redirect(user ? "/saas/dashboard" : "/saas/login");
}
