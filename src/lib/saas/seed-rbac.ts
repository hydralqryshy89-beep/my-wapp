import type { PrismaClient } from "@/generated/prisma/client";
import { DEFAULT_ROLES, PERMISSION_KEYS } from "@/lib/saas/constants";

/**
 * Upserts the fixed permission catalog and the six default system roles.
 * Safe to call on every deploy: every row here is keyed by a stable `key`
 * that no Phase 1 UI lets an admin edit, so re-running never clobbers
 * user data — unlike the Marketing Plan app's demo-data seed.
 */
export async function seedSaasRbac(prisma: PrismaClient): Promise<void> {
  const permissionIdByKey = new Map<string, string>();
  for (const key of PERMISSION_KEYS) {
    const permission = await prisma.saasPermission.upsert({ where: { key }, update: {}, create: { key } });
    permissionIdByKey.set(key, permission.id);
  }

  for (const roleDef of DEFAULT_ROLES) {
    const role = await prisma.saasRole.upsert({
      where: { key: roleDef.key },
      update: { name: roleDef.name, description: roleDef.description, system: true },
      create: {
        key: roleDef.key,
        name: roleDef.name,
        description: roleDef.description,
        system: true,
        organizationId: null,
        projectId: null,
      },
    });

    const permissionIds = roleDef.permissions.map((k) => permissionIdByKey.get(k)!);
    for (const permissionId of permissionIds) {
      await prisma.saasRolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
    // A permission removed from a role's definition above must stop applying at
    // runtime too — upsert only adds grants, so prune whatever is no longer listed.
    await prisma.saasRolePermission.deleteMany({
      where: { roleId: role.id, permissionId: { notIn: permissionIds } },
    });
  }
}
