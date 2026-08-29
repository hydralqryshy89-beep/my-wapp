// Pure, framework-agnostic permission logic — no Prisma/session imports here,
// so client components (e.g. the Sidebar) can safely import this without
// pulling Node-only database code into the browser bundle.
//
// Fixed two-role model per spec §17 (no per-resource custom permissions):
// Admin has full access; Staff can operate day-to-day records (add
// students, register students, record payments, mark attendance, issue
// certificates) but cannot delete core data, manage users, or touch settings.
import type { UserRole } from "@/lib/constants";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string | null;
  isAdmin: boolean;
}

export type Action =
  | "courses.manage" // create/edit/delete courses & instructors
  | "students.create"
  | "students.edit"
  | "students.delete"
  | "registrations.create"
  | "registrations.edit" // includes cancelling (status change, never a hard delete)
  | "payments.create" // payments are never edited or deleted once recorded
  | "attendance.mark"
  | "certificates.issue"
  | "settings.manage"
  | "users.manage";

const STAFF_ALLOWED: ReadonlySet<Action> = new Set<Action>([
  "students.create",
  "students.edit",
  "registrations.create",
  "registrations.edit",
  "payments.create",
  "attendance.mark",
  "certificates.issue",
]);

export function can(user: CurrentUser, action: Action): boolean {
  if (user.isAdmin) return true;
  return STAFF_ALLOWED.has(action);
}
