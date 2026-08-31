import { prisma } from "@/lib/prisma";

export { hasPermission, requirePermission } from "@/lib/saas/authorization";

/** The full platform permission catalog, as seeded — used to render permission matrices. */
export function listPermissions() {
  return prisma.saasPermission.findMany({ orderBy: { key: "asc" } });
}
