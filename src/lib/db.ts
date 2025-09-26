import { PrismaClient } from "@prisma/client";
const globalForPrisma = global as unknown as { prisma?: PrismaClient };

if (!process.env.DATABASE_URL) {
  // В DEV: понятная ошибка. В PROD лучше не логировать URL.
  console.warn("[DB] DATABASE_URL is not set. Check .env.local / server environment variables.");
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ["error", "warn"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
