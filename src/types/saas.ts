import type { PermissionKey } from "@/lib/saas/constants";

export interface CurrentSaasUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

/**
 * Describes whose data a Server Action or Service is about to touch. Built
 * server-side from the session + validated membership rows — never trusted
 * from client-supplied IDs alone (see requireOrganizationMember /
 * requireProjectContext in src/lib/saas/authorization.ts, which are the only
 * legitimate way to construct one with a non-empty scope).
 */
export interface TenantContext {
  userId: string;
  organizationId: string;
  projectId?: string;
}

export type PermissionSet = ReadonlySet<PermissionKey>;
