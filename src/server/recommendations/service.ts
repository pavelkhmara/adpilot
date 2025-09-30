import { prisma } from "@/lib/db";
import type { Prisma, Recommendation as DbRec } from "@prisma/client";

export type RecQuery = {
  clientId: string;
  campaignId?: string;
  limit?: number;
};

function dbToContract(r: DbRec) {
  return {
    id: r.id,
    clientId: r.clientId,
    channel: r.channel,
    level: r.level, // "campaign" | "adset" | "ad" | "creative"
    target: {
      campaignId: r.campaignId,
      adSetId: r.adSetId,
      adId: r.adId,
      creativeId: r.creativeId,
      externalId: r.externalId ?? null,
    },
    type: r.type,
    status: r.status,
    reason: r.reason ?? "",
    explanation: r.explanation ?? null,
    expectedEffect: {
      kpi: r.expectedKpi,
      deltaAbs: r.expectedDeltaAbs ? Number(r.expectedDeltaAbs) : null,
      deltaRel: r.expectedDeltaRel ? Number(r.expectedDeltaRel) : null,
      horizon: r.horizon,
    },
    confidence: Number(r.confidence),
    urgency: r.urgency,
    priorityScore: Number(r.priorityScore),
    validUntil: r.validUntil ? r.validUntil.toISOString() : null,
    freshnessAt: r.freshnessAt ? r.freshnessAt.toISOString() : null,
    actionPayload: r.actionPayload,
    createdBy: r.createdBy,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function listRecommendations(q: RecQuery) {
  const where: Prisma.RecommendationWhereInput = { clientId: q.clientId };
  if (q.campaignId) where.campaignId = q.campaignId;

  const items = await prisma.recommendation.findMany({
    where,
    orderBy: [{ priorityScore: "desc" }, { createdAt: "desc" }],
    take: q.limit ?? 200,
  });

  return items.map(dbToContract);
}
