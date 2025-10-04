import { prisma } from "../src/lib/db";
import { Prisma } from "@prisma/client";

// аккуратный "рандом", чтобы сид получался похожим между запусками
const r = (seed = 42) => {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 0xffffffff;
    return s / 0xffffffff;
  };
};
const rnd = r(12345);

function pick<T>(arr: T[]) { return arr[Math.floor(rnd() * arr.length)]; }

function makeRec(input: {
  clientId: string;
  channel: string;
  campaignId?: string | null;
  type: "pause" | "scale" | "creative";
  reason: string;
  priority: number;
}) {
  const now = new Date();
  return {
    clientId: input.clientId,
    channel: input.channel ?? "meta_ads",
    level: "campaign",
    campaignId: input.campaignId ?? null,
    adSetId: null,
    adId: null,
    creativeId: null,
    externalId: null,

    type: input.type,
    status: "proposed",

    reason: input.reason,
    explanation: null,

    expectedKpi: "Spend",
    expectedDeltaAbs: null,
    expectedDeltaRel: null,
    horizon: "T7",

    confidence: new Prisma.Decimal(0.6 + rnd() * 0.3), // 0.6..0.9
    urgency: pick(["low","med","high"]),
    priorityScore: new Prisma.Decimal(input.priority),

    validUntil: null,
    freshnessAt: now,

    actionPayload: { seed: true },

    createdBy: "human",
    createdAt: now,
    // updatedAt — авто
  } satisfies Prisma.RecommendationCreateManyInput;
}

async function main() {
  // 1) найдём все кампании (лёгкий select)
  const campaigns = await prisma.campaign.findMany({
    select: { id: true, clientId: true, channel: true, status: true, name: true },
    orderBy: { updatedAt: "desc" },
    take: 5000, // безопасный предел
  });

  // 2) сгруппируем клиентId → кампании
  const byClient = new Map<string, Array<(typeof campaigns)[number]>>();
  for (const c of campaigns) {
    if (!byClient.has(c.clientId)) byClient.set(c.clientId, []);
    byClient.get(c.clientId)!.push(c);
  }

  const data: Prisma.RecommendationCreateManyInput[] = [];

  // 3) для каждой кампании добавим 1–2 рекомендации
  for (const c of campaigns) {
    // один «pause» для части кампаний
    if (rnd() < 0.5) {
      data.push(
        makeRec({
          clientId: c.clientId,
          channel: c.channel,
          campaignId: c.id,
          type: "pause",
          reason: `Seed: low ROAS on ${c.name}`,
          priority: Math.round(5 + rnd() * 10),
        })
      );
    }
    // и/или один «scale»
    if (rnd() < 0.6) {
      data.push(
        makeRec({
          clientId: c.clientId,
          channel: c.channel,
          campaignId: c.id,
          type: "scale",
          reason: `Seed: scale budget for ${c.name}`,
          priority: Math.round(8 + rnd() * 12),
        })
      );
    }
    // иногда «creative»
    if (rnd() < 0.3) {
      data.push(
        makeRec({
          clientId: c.clientId,
          channel: c.channel,
          campaignId: c.id,
          type: "creative",
          reason: `Seed: rotate creatives in ${c.name}`,
          priority: Math.round(3 + rnd() * 8),
        })
      );
    }
  }

  // 4) для клиентов без кампаний — по одной общей рекомендации (campaignId = null)
  // (если у тебя есть таблица clients — можно брать из неё, но возьмём по факту distinct из кампаний)
  // На случай если кампаний нет вообще — создадим заглушечную на основе любых клиентов из campaigns
  if (campaigns.length === 0) {
    console.log("No campaigns found. Seeding a generic recommendation for a demo client (if any).");
  } else {
    for (const [clientId, arr] of byClient) {
      if (!arr || arr.length === 0) {
        data.push(
          makeRec({
            clientId,
            channel: "meta_ads",
            campaignId: null,
            type: "pause",
            reason: "Seed: account level pause (no campaigns found)",
            priority: 5,
          })
        );
      }
    }
  }

  if (data.length === 0) {
    console.log("Nothing to insert (no campaigns, no clients).");
    return;
  }

  // 5) вставим пачкой
  const chunkSize = 500;
  let inserted = 0;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    const res = await prisma.recommendation.createMany({ data: chunk, skipDuplicates: true });
    inserted += res.count;
  }

  console.log(`Seeded recommendations: ${inserted} (from planned ${data.length})`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
