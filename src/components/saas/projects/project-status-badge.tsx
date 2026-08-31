import { Badge } from "@/components/saas/ui/badge";
import { STATUS_BADGE_STYLES, type ProjectStatus } from "@/lib/saas/constants";

export function ProjectStatusBadge({ status }: { status: string }) {
  const style = STATUS_BADGE_STYLES[status as ProjectStatus] ?? STATUS_BADGE_STYLES.ACTIVE;
  return <Badge className={style}>{status === "ACTIVE" ? "Active" : "Archived"}</Badge>;
}
