import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

async function main() {
  const now = new Date();
  await prisma.recommendation.create({
    data: {
      clientId: "cmg0y704t00007koc2qbaqlmr",
      channel: "meta",
      level: "campaign",
      campaignId: null,
      type: "pause",
      status: "proposed",
      reason: "seed test",
      explanation: null,
      expectedKpi: "Spend",
      expectedDeltaAbs: null,
      expectedDeltaRel: null,
      horizon: "T7",
      confidence: new Prisma.Decimal(0.7),
      urgency: "med",
      priorityScore: new Prisma.Decimal(10),
      validUntil: null,
      freshnessAt: now,
      actionPayload: { note: "seed" },
      createdBy: "human",
      createdAt: now,
    },
  });
  console.log("Seeded 1 rec.");
}
main().finally(()=>process.exit(0));
