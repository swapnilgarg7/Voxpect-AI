// Singleton Prisma client.
// Next.js hot-reload creates new module instances in development, which would
// exhaust the PostgreSQL connection pool.  We work around this by attaching
// the client to `globalThis` so it survives HMR reloads.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
