import { requireSaasUser } from "@/lib/saas/current-user";
import { AppShell } from "@/components/saas/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSaasUser();
  return <AppShell user={user}>{children}</AppShell>;
}
