import { expect, test } from "vitest";
import { prisma } from "../src/lib/db";

test("db is reachable & basic query works", async () => {
  const rows = await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 as ok`;
  expect(Array.isArray(rows)).toBe(true);
  expect(rows[0]?.ok).toBe(1);

  const agg = await prisma.campaign.aggregate({ _count: true });
  expect(agg._count).toBeTypeOf("number");
});