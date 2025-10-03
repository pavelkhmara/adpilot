import { prisma } from "../../lib/db";
import { JsonArray } from "@prisma/client/runtime/library";
import { headers } from "next/headers";
import { isDemoOn, throttleWindowMinutes } from "../../server/sim/common";
import { logger } from "../../server/debug/logger";

type Sum = { spend:number; revenue:number; clicks:number; impressions:number; conv:number; freq:number };
type DecideOpts = { chaos?: boolean };

function decideActions(sum: {
  spend: number; revenue: number; clicks: number; impressions: number; conv: number; freq: number;
}, opts: DecideOpts = {}) {
  const chaos = !!opts.chaos;
  const actions: Array<{
    actionType: string;
    payload: Record<string, number>;
    reason: Record<string, JsonArray | Record<string, number | boolean> >;
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

  const SCALE_UP_ROAS = chaos ? 1.8 : 2.5;
  const SCALE_DOWN_ROAS = chaos ? 1.2 : 1.0;
  const CTR_LOW = chaos ? 0.015 : 0.010;
  const FREQ_HIGH = chaos ? 3.0 : 3.5;

  // scale_down при слабом ROAS
  if (sum.spend > 50 && roas >= SCALE_UP_ROAS) {
    actions.push({
      actionType: "scale_up",
      payload: { pct: chaos ? 30 : 20 },
      reason: { rules: ["roas_good_7d"], details: { roas, chaos } },
      priority: chaos ? 85 : 80,
    });
  }

  if (sum.spend > 100 && roas > 0 && roas < SCALE_DOWN_ROAS) {
    actions.push({
      actionType: "scale_down",
      payload: { pct: chaos ? 20 : 15 },
      reason: { rules: ["roas_poor_7d"], details: { roas, chaos } },
      priority: chaos ? 80 : 75,
    });
  }

  // rotate_creatives при низком CTR
  if (sum.impressions > 4000 && ctr < CTR_LOW) {
    actions.push({
      actionType: "rotate_creatives",
      payload: { variants: chaos ? 3 : 2 },
      reason: { rules: ["ctr_low_7d"], details: { ctr, chaos } },
      priority: chaos ? 65 : 60,
    });
  }

  // cap_frequency если зашкаливает частота
  if (sum.freq >= FREQ_HIGH) {
    actions.push({
      actionType: "cap_frequency",
      payload: { maxFreq: chaos ? 2.8 : 3.0 },
      reason: { rules: ["freq_high_7d"], details: { freq: sum.freq, chaos } },
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

export async function emitRecommendationsForCampaign(clientId: string, campaignId: string, baseUrl: string, opts: DecideOpts = {}) {
  if (!isDemoOn()) return { ok: true, demo: "disabled", items: 0 };

  const sinceThrottle = new Date(Date.now() - throttleWindowMinutes() * 60_000);
  const recent = await prisma.recommendation.findFirst({
    where: {
      campaignId,
      clientId,
      createdAt: { gte: sinceThrottle },
      // считаем только «живые/актуальные» рекомендации
      status: { in: ["proposed"] },
    },
    select: { id: true, createdAt: true, status: true },
    orderBy: { createdAt: "desc" },
  });
  if (recent) {
    logger.info("emitRecommendationsForCampaign", "throttled", { campaignId, lastId: recent.id });
    return { ok: true, items: 0, throttled: true, lastId: recent.id };
  }

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

  const actions = decideActions(sum, opts);
  if (actions.length === 0) return { ok: true, items: 0 };

  // фильтр от дублей (по типу action)
  logger.debug("emitRecommendationsForCampaign", "decideActions", { campaignId, actions: actions.map(a => a.actionType), chaos: !!opts.chaos });
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

  logger.info("emitRecommendationsForCampaign", "run", { campaignId, items: items.length });
  try {
    await fetch(`${baseUrl}/api/recommendations/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    return { ok: true, items: items.length };
  } catch (e) {
    logger.error("emitRecommendationsForCampaign", "run_failed", { campaignId, error: String(e) });
    console.warn("[simRules] emitRecommendationsForCampaign failed:", e);
    return { ok: false, error: String(e) };
  }
}
