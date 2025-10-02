import { describe, expect, it, test } from "vitest";
import { prisma } from "../src/lib/db";

const HAS_DB = !!process.env.DATABASE_URL;

describe("db health", () => {
  it(HAS_DB ? "can connect and run a trivial query" : "skipped (no DATABASE_URL)", async () => {
    if (!HAS_DB) return;
    await prisma.$connect();
    const rows = await prisma.$queryRawUnsafe("SELECT 1 as ok");
    expect(rows).toBeDefined();
    await prisma.$disconnect();
  });

  it("can instantiate PrismaClient", async () => {
    const rows = await prisma.$queryRawUnsafe("SELECT 1 as ok");
    expect(rows).toBeDefined();
  });
});

test("db is reachable & basic query works", async () => {
  const rows = await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 as ok`;
  expect(Array.isArray(rows)).toBe(true);
  expect(rows[0]?.ok).toBe(1);

  const agg = await prisma.campaign.aggregate({ _count: true });
  expect(agg._count).toBeTypeOf("number");
});