import { PrismaClient } from "@prisma/client";
import { logger } from "../server/debug/logger";

const enableSql = process.env.DEBUG_SQL === "on";
// const globalForPrisma = global as unknown as { prisma?: PrismaClient };

if (!process.env.DATABASE_URL) {
  console.warn("[DB] DATABASE_URL is not set. Check .env.local / server environment variables.");
}

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  // globalForPrisma.prisma ??
  new PrismaClient({
  log: enableSql ? [{ emit: "event", level: "query" }, { emit: "event", level: "error" }, { emit: "event", level: "warn" }] : [],
});

// if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

if (enableSql && prisma) {
  prisma.$on("query", (e) => {
    logger.debug("sql", e.query, { params: e.params, durMs: e.duration });
  });
  prisma.$on("warn", (e) => logger.warn("sql", e.message));
  prisma.$on("error", (e) => logger.error("sql", e.message));
}