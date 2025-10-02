import { prisma } from "../../lib/db";
import { JsonArray } from "@prisma/client/runtime/library";
import { headers } from "next/headers";

type Sum = { spend:number; revenue:number; clicks:number; impressions:number; conv:number; freq:number };

function decideActions(sum: {
  spend: number; revenue: number; clicks: number; impressions: number; conv: number; freq: number;
}) {
  const actions: Array<{
    actionType: string;
    payload: Record<string, number>;
    reason: Record<string, JsonArray | Record<string, number> >;
    priority: number;
  }> = [];

  const roas = sum.spend > 0 ? sum.revenue / sum.spend : 0;
  const ctr = sum.impressions > 0 ? sum.clicks / sum.impressions : 0;

  // scale_up при хорошем ROAS
  if (sum.spend > 50 && roas >= 2.5) {
    actions.push({
      actionType: "scale_up",
      payload: { pct: 20 },
      reason: { rules: ["roas_good_7d"], details: { roas } },
      priority: 80,
    });
  }

  // scale_down при слабом ROAS
  if (sum.spend > 100 && roas > 0 && roas < 1.0) {
    actions.push({
      actionType: "scale_down",
      payload: { pct: 15 },
      reason: { rules: ["roas_poor_7d"], details: { roas } },
      priority: 75,
    });
  }

  // rotate_creatives при низком CTR
  if (sum.impressions > 5000 && ctr < 0.01) {
    actions.push({
      actionType: "rotate_creatives",
      payload: { variants: 2 },
      reason: { rules: ["ctr_low_7d"], details: { ctr } },
      priority: 60,
    });
  }

  // cap_frequency если зашкаливает частота
  if (sum.freq >= 3.5) {
    actions.push({
      actionType: "cap_frequency",
      payload: { maxFreq: 3.0 },
      reason: { rules: ["freq_high_7d"], details: { freq: sum.freq } },
      priority: 55,
    });
  }

  // reallocate_budget — если много кампаний будет видно в будущем; тут пропустим
  return actions;
}

async function recentDuplicateExists(clientId: string, campaignId: string, type: string) {
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const existing = await prisma.recommendation.findFirst({
    where: {
      clientId, campaignId,
      type,
      createdAt: { gte: since },
    //   status: { in: ["new", "pending"] },
    },
    select: { id: true },
  });
  return Boolean(existing);
}

async function getBaseUrlFromHeaders() {
  const h = headers();
  const host = (await h).get("x-forwarded-host") ?? (await h).get("host");
  const proto = (await h).get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  return (
    process.env.NEXT_PUBLIC_BASE_URL
    ?? (host ? `${proto}://${host}` : `http://localhost:${process.env.PORT ?? 3000}`)
  );
}

export async function emitRecommendationsForCampaign(clientId: string, campaignId: string, baseUrl: string) {
  // суммируем 7д метрики
  const since = new Date(); since.setUTCHours(0,0,0,0); since.setUTCDate(since.getUTCDate() - 7);
  const rows = await prisma.metricDaily.findMany({
    where: { campaignId, date: { gte: since } },
    select: { spend: true, revenue: true, clicks: true, impressions: true, conversions: true, frequency: true },
  });

  const sum = rows.reduce((acc, r) => {
    acc.spend += Number(r.spend ?? 0);
    acc.revenue += Number(r.revenue ?? 0);
    acc.clicks += Number(r.clicks ?? 0);
    acc.impressions += Number(r.impressions ?? 0);
    acc.conv += Number(r.conversions ?? 0);
    acc.freq += Number(r.frequency ?? 0);
    return acc;
  }, { spend: 0, revenue: 0, clicks: 0, impressions: 0, conv: 0, freq: 0 });

  // средняя частота (а не сумма)
  if (rows.length) sum.freq = sum.freq / rows.length;

  const actions = decideActions(sum);
  if (actions.length === 0) return { ok: true, items: 0 };

  // фильтр от дублей (по типу action)
  const filtered: typeof actions = [];
  for (const a of actions) {
    if (!(await recentDuplicateExists(clientId, campaignId, a.actionType))) {
      filtered.push(a);
    }
  }
  if (filtered.length === 0) return { ok: true, items: 0 };

  const camp = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { channel: true }});
  const channel = camp?.channel?.toLowerCase().includes("google") ? "google" : "meta";


  // вызов вашего endpoint'а
  const items = filtered.map(a => ({
    clientId,
    channel: channel,              // или channel кампании — можно прочитать из Campaign при желании
    entityType: "campaign",
    campaignId,
    actionType: a.actionType,
    payload: a.payload,
    reason: a.reason,
    priority: a.priority,
  }));

  try {
    await fetch(`${baseUrl}/api/recommendations/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    return { ok: true, items: items.length };
  } catch (e) {
    console.warn("[simRules] emitRecommendationsForCampaign failed:", e);
    return { ok: false, error: String(e) };
  }
}
