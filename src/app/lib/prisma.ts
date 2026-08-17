import { PrismaClient } from "@prisma/client";

/**
 * Prisma Global Singleton Pattern.
 * In development, Next.js/Nodemon hot-reloads modules on file changes.
 * Without this, each hot-reload creates a new PrismaClient — causing
 * "too many connections" errors. The globalThis reference persists across reloads.
 */
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
