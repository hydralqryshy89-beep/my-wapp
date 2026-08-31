// Seeds the SaaS Builder's fixed system reference data: the permission
// catalog and the six default (system) roles with their permission grants.
//
// Unlike prisma/seed.ts (which creates *demo* Marketing Plan data and is
// deliberately NOT run automatically on every deploy — see its own git
// history), this script only ever upserts fixed rows keyed by a stable
// `key`, which no UI in Phase 1 lets an admin edit or delete. Re-running it
// on every deploy is safe and idempotent, and is required for the SaaS
// Builder's organization/project creation to work at all — see the
// "System roles are not seeded" guard in src/services/saas/*.service.ts.
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { seedSaasRbac } from "../src/lib/saas/seed-rbac";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

seedSaasRbac(prisma)
  .then(() => console.log("SaaS Builder RBAC seeded."))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
