/**
 * Add an authorized user to the dashboard.
 *
 * Usage:
 *   npx tsx scripts/add-user.ts <email> <password> [name]
 *
 * Example:
 *   npx tsx scripts/add-user.ts alice@example.com s3cur3pass "Alice Smith"
 */

import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const [, , email, password, name] = process.argv;

if (!email || !password) {
  console.error("Usage: npx tsx scripts/add-user.ts <email> <password> [name]");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash(password, 12);

  const user = await prisma.authorizedUser.upsert({
    where: { email },
    update: { passwordHash, name: name ?? undefined },
    create: { email, passwordHash, name: name ?? undefined },
  });

  console.log(`✓ User ${user.email} saved (id: ${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
