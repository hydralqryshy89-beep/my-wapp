import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export interface RecordAuditLogInput {
  organizationId: string;
  projectId?: string | null;
  userId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
}

/** Never pass passwords, tokens, or secrets in `metadata` — this is a permanent record. */
export async function recordAuditLog(
  input: RecordAuditLogInput,
  tx: Prisma.TransactionClient | typeof prisma = prisma
): Promise<void> {
  await tx.saasAuditLog.create({
    data: {
      organizationId: input.organizationId,
      projectId: input.projectId ?? null,
      userId: input.userId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? undefined,
    },
  });
}

export async function listAuditLogs(organizationId: string, options: { projectId?: string; limit?: number } = {}) {
  return prisma.saasAuditLog.findMany({
    where: { organizationId, projectId: options.projectId },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: options.limit ?? 50,
  });
}
