import { prisma } from "../../../../lib/db";
import { Prisma } from "@prisma/client";

type Incoming = {
  clientId: string;
  channel?: string;
  campaignId?: string;
  entityType: "campaign" | "adset" | "ad" | "creative";
  entityId?: string | null;
  actionType: string;            // "pause" | "scale" | "creative" | ...
  payload?: unknown;             // { pct: number } | ...
  reason?: { rules?: string[] } | string;
  priority?: number;
};

function mapLevel(t: Incoming["entityType"]) {
  if (t === "adset") return "adset";
  if (t === "ad") return "ad";
  if (t === "creative") return "creative";
  return "campaign";
}

function toStringReason(r?: Incoming["reason"]): string {
  if (!r) return "";
  if (typeof r === "string") return r;
  if (Array.isArray(r.rules)) return r.rules.join(", ");
  return "";
}

export async function POST(req: Request) {
  const body = await req.json();
  const items: Incoming[] = Array.isArray(body) ? body : body?.items ?? [];

  const now = new Date();

  const data: Prisma.RecommendationCreateManyInput[] = items.map((x) => {
    const level = mapLevel(x.entityType);
    return {
      clientId: x.clientId,
      channel: x.channel ?? "meta",
      level,
      campaignId: level === "campaign" ? x.campaignId ?? null : x.campaignId ?? null,
      adSetId:   level === "adset"    ? x.entityId ?? null : null,
      adId:      level === "ad"       ? x.entityId ?? null : null,
      creativeId:level === "creative" ? x.entityId ?? null : null,
      externalId: null,

      type: x.actionType,
      status: "proposed",

      reason: toStringReason(x.reason),
      explanation: null,

      expectedKpi: "Spend",            // дефолт для MVP
      expectedDeltaAbs: null,
      expectedDeltaRel: null,
      horizon: "T7",
      confidence: new Prisma.Decimal(0.6),
      urgency: "med",
      priorityScore: new Prisma.Decimal(x.priority ?? 0),

      validUntil: null,
      freshnessAt: now,

      actionPayload: x.payload ?? {},  // раньше было payload

      createdBy: "rule",
      createdAt: now,
      // updatedAt — авто
    };
  });

  await prisma.recommendation.createMany({ data });

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}

// export async function POST(req: NextRequest) {
//   try {
//     const sp = req.nextUrl.searchParams;
//     const clientId = sp.get("clientId");
//     const campaignId = sp.get("campaignId");

//     if (!clientId && !campaignId) {
//       return NextResponse.json({ error: "clientId or campaignId is required" }, { status: 400 });
//     }

//     // Собираем список кампаний-мишеней
//     let campaigns: { id: string; name: string | null }[] = [];

//     if (campaignId) {
//       const c = await prisma.campaign.findUnique({
//         where: { id: campaignId },
//         select: { id: true, name: true },
//       });
//       if (!c) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
//       campaigns = [c];
//     } else if (clientId) {
//       campaigns = await prisma.campaign.findMany({
//         where: { clientId },
//         select: { id: true, name: true },
//         take: 5,
//       });
//       if (campaigns.length === 0) {
//         return NextResponse.json({ error: "No campaigns for this client" }, { status: 404 });
//       }
//     }

//     // Демо-рекомендации (по кампании)
//     const data = campaigns.map((c) => ({
//       campaignId: c.id,          
//       entityType: "campaign",
//       entityId: c.id,
//       actionType: "DecreaseBudgetByPct",
//       payload: { pct: 10 },
//       reason: { rules: ["demo_rising_cpa"] },
//       priority: 50,
//       status: "proposed",
//     }));

//     await prisma.recommendation.createMany({ data });
//     return NextResponse.json({ ok: true, created: data.length });
//   } catch (err) {
//     console.error("POST /api/recommendations/run error:", err);
//     return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
//   }
// }
