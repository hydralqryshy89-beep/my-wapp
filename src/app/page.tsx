import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { firstAccessiblePath } from "@/components/layout/nav-items";

export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? firstAccessiblePath(user) : "/login");
}
