import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "../src/lib/db";
import { resetDb, createClient, createCampaign, createRecommendation } from "./e2e/testDb";
import * as DismissRoute from "../src/app/api/recommendations/dismiss/route";

describe("POST /api/recommendations/dismiss", () => {
  beforeAll(async () => { await prisma.$connect(); });
  afterAll(async () => { await prisma.$disconnect(); });
  beforeEach(async () => { await resetDb(); });

  it("dismisses recommendation & is idempotent by reason", async () => {
    const client = await createClient();
    const camp = await createCampaign(client.id);
    const rec = await createRecommendation(camp.id, client.id);

    const body = { id: rec.id, by: "user:e2e", reason: "noise" };

    const req1 = new Request("http://local/api/recommendations/dismiss", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const res1 = await DismissRoute.POST(req1);
    expect(res1.status).toBe(200);
    const json1 = await res1.json();
    expect(json1.status).toBe("dismissed");

    // state
    const after = await prisma.recommendation.findUnique({ where: { id: rec.id } });
    expect(after?.status).toBe("dismissed");

    // повтор — дубля нет
    const req2 = new Request("http://local/api/recommendations/dismiss", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const res2 = await DismissRoute.POST(req2);
    const json2 = await res2.json();
    expect(json2.ok).toBe(true);

    const actions = await prisma.recommendationAction.findMany({ where: { recommendationId: rec.id } });
    expect(actions.length).toBe(1);
  });
});
