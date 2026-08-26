import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const SALT_ROUNDS = 10;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user?.passwordHash) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;
  // A user with no access role assigned has no permissions on any section (see
  // src/lib/access.ts — can() defaults to false with no role), but the dashboard
  // itself has no per-resource gate, so without this check they could still log
  // in and see the company-wide overview. Block the login outright instead.
  if (!user.accessRoleId) return "no-role" as const;
  return user;
}
