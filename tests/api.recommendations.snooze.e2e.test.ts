import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "../src/lib/db";
import { resetDb, createClient, createCampaign, createRecommendation } from "./e2e/testDb";
import * as SnoozeRoute from "../src/app/api/recommendations/snooze/route";

describe("POST /api/recommendations/snooze", () => {
  beforeAll(async () => { await prisma.$connect(); });
  afterAll(async () => { await prisma.$disconnect(); });
  beforeEach(async () => { await resetDb(); });

  it("sets validUntil but keeps status proposed; idempotent by (id, until, note)", async () => {
    const client = await createClient();
    const camp = await createCampaign(client.id);
    const rec = await createRecommendation(camp.id, client.id, { status: "proposed" });

    const until = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
    const body = { id: rec.id, by: "user:e2e", until, note: "busy" };

    const req1 = new Request("http://local/api/recommendations/snooze", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const res1 = await SnoozeRoute.POST(req1);
    const json1 = await res1.json();
    expect(res1.status).toBe(200);
    expect(json1.status).toBe("proposed");
    expect(json1.validUntil).toBe(until);

    const after = await prisma.recommendation.findUnique({ where: { id: rec.id } });
    expect(after?.status).toBe("proposed");
    expect(after?.validUntil?.toISOString()).toBe(new Date(until).toISOString());

    // повтор — дублей нет
    const req2 = new Request("http://local/api/recommendations/snooze", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const res2 = await SnoozeRoute.POST(req2);
    const json2 = await res2.json();
    expect(json2.ok).toBe(true);

    const actions = await prisma.recommendationAction.findMany({ where: { recommendationId: rec.id } });
    expect(actions.length).toBe(1);
  });
});
