import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const SALT_ROUNDS = 10;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifySaasCredentials(email: string, password: string) {
  const user = await prisma.saasUser.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;
  return user;
}
