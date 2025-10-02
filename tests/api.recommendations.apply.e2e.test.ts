import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "../src/lib/db";
import { resetDb, createClient, createCampaign, createRecommendation } from "./e2e/testDb";
import * as ApplyRoute from "../src/app/api/recommendations/apply/route";

describe("POST /api/recommendations/apply", () => {
  beforeAll(async () => {
    // убеждаемся, что клиент Prisma подцепился к test DB
    await prisma.$connect();
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    await resetDb();
  });

  it("applies recommendation once (idempotent)", async () => {
    const client = await createClient();
    const camp = await createCampaign(client.id);
    const rec = await createRecommendation(camp.id, client.id, { status: "proposed", type: "pause" });

    // 1-й вызов
    const req1 = new Request("http://local/api/recommendations/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rec.id, by: "user:e2e" }),
    });
    const res1 = await ApplyRoute.POST(req1);
    const json1 = await res1.json();
    expect(res1.status).toBe(200);
    expect(json1.ok).toBe(true);
    expect(json1.status).toBe("applied");

    // состояние в БД
    const after1 = await prisma.recommendation.findUnique({ where: { id: rec.id } });
    expect(after1?.status).toBe("applied");

    // 2-й вызов (тот же id) — не должен создавать дубль
    const req2 = new Request("http://local/api/recommendations/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rec.id, by: "user:e2e" }),
    });
    const res2 = await ApplyRoute.POST(req2);
    const json2 = await res2.json();
    expect(res2.status).toBe(200);
    expect(json2.ok).toBe(true);

    // проверим, что записей действий не >1
    const actions = await prisma.recommendationAction.findMany({ where: { recommendationId: rec.id } });
    expect(actions.length).toBe(1);
    expect(actions[0].result).toBe("ok");
  });
});
