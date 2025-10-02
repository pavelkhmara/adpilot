import { Prisma, RecStatus } from "@prisma/client";
import { prisma } from "../../src/lib/db";

const rand = () => Math.random().toString(36).slice(2, 8);

export async function resetSchema() {
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "e2e" CASCADE; CREATE SCHEMA "e2e";`);
}

export async function resetDb() {
  await prisma.recommendationAction.deleteMany({});
  await prisma.recommendation.deleteMany({});
  await prisma.metricDaily?.deleteMany?.({}).catch(()=>{});
  await prisma.campaign.deleteMany({});
  await prisma.client?.deleteMany?.({}).catch(()=>{});
}

export async function createClient(data?: Partial<{ id: string; name: string }>) {
  const created = await prisma.client.create({
    data: {
      name: data?.name ?? `E2E Client ${rand()}`,
      key: data?.id ?? `cli_${Date.now()}`
    },
    select: { id: true, name: true },
  });
  return created;
}

export async function createCampaign(clientId: string, data?: Partial<{ id: string; name: string; channel: string; status: string }>) {
  await prisma.client.findUniqueOrThrow({ where: { id: clientId }, select: { id: true } });
  return prisma.campaign.create({
    data: {
      client: { connect: { id: clientId } },
      name: data?.name ?? "E2E Campaign",
      channel: data?.channel ?? "meta",
      status: data?.status ?? "active",
    },
    select: { id: true, name: true, clientId: true },
  });
}

export async function createRecommendation(campaignId: string, clientId: string, data: Partial<{ status: RecStatus; type: "pause" | "scale" | "creative"; action: string | null; actionPayload: Prisma.InputJsonValue | Prisma.NullTypes.JsonNull; note: string | null; validUntil: Date | null }> = {}) {
  await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId }, select: { id: true } });
  await prisma.client.findUniqueOrThrow({ where: { id: clientId }, select: { id: true } });  
  const now = new Date();
    return prisma.recommendation.create({
        data: {
        clientId,
        channel: "meta",
        level: "campaign",
        campaignId,
        adSetId: null,
        adId: null,
        creativeId: null,
        externalId: null,

        type: "pause",
        status: "proposed",

        reason: "e2e seed",
        explanation: null,

        expectedKpi: "Spend",
        expectedDeltaAbs: null,
        expectedDeltaRel: null,
        horizon: "T7",

        confidence: new Prisma.Decimal(0.8),
        urgency: "med",
        priorityScore: new Prisma.Decimal(10),

        validUntil: null,
        freshnessAt: now,

        actionPayload: data.actionPayload ?? Prisma.JsonNull,

        createdBy: "human",
        createdAt: now,

        ...data,
        },
    });
}
