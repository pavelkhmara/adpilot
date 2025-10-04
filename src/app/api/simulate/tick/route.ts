import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { cookies, headers } from "next/headers";
import { emitRecommendationsForCampaign } from "../../../../server/recommendations/simRules";
import { isDemoOn, isChaosMode, rngFromParams } from "../../../../server/sim/common";
import { logger } from "../../../../server/debug/logger";
import { withRequestContext } from "../../../../server/debug/withRequestContext";

async function resolveBaseUrl(): Promise<string> {
  const h = headers();
  const host = (await h).get("x-forwarded-host") ?? (await h).get("host");
  const proto = (await h).get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  return process.env.NEXT_PUBLIC_BASE_URL ?? (host ? `${proto}://${host}` : `http://localhost:${process.env.PORT ?? 3000}`);
}

async function randomUpdate(campaignId: string, chaos: boolean, rng: (() => number) | null) {
  const today = new Date(); today.setUTCHours(0,0,0,0);
  // достаём сегодня/вчера — и чуть шевелим
  const last2 = await prisma.metricDaily.findMany({
    where: { campaignId, date: { gte: new Date(today.getTime() - 86400000*1) } },
    orderBy: { date: "asc" },
  });
  
  
  const rand = () => (rng ? rng() : Math.random());

  const bump = (x: number, relRange = 0.15) => {
    const k = 1 + (rand()*2 - 1) * (chaos ? relRange*2 : relRange);
    return Math.max(0, x * k);
  };

  for (const row of last2) {
      const spend = bump(Number(row.spend));
      const clicks = Math.round(bump(row.clicks));
      const impr = Math.round(bump(row.impressions, 0.2));
      const conv = Math.max(0, Math.round(bump(row.conversions, 0.25)));
      const revenue = bump(Number(row.revenue), 0.3);
      const ctr = clicks / Math.max(1, impr);
      const freq = bump(Number(row.frequency), 0.15);

      await prisma.metricDaily.update({
        where: { id: row.id },
        data: {
          spend: String(spend.toFixed(2)),
          clicks, 
          impressions: impr, 
          conversions: conv,
          revenue: String(revenue.toFixed(2)),
          ctr: String(ctr.toFixed(4)),
          frequency: String(freq.toFixed(2)),
        },
      });
    }

    // чаще меняем статусы в хаосе
    const pStatus = chaos ? 0.35 : 0.15;
    if (Math.random() < pStatus) {
      const status = Math.random() < 0.5 ? "Learning" : "Active";
      await prisma.campaign.update({ where: { id: campaignId }, data: { status } });
      await prisma.campaignEvent.create({
        data: { campaignId, type: "status_changed", ts: new Date(), data: { status, chaos } },
      });
    }
}

export async function POST(req: Request) {
  return withRequestContext(async () => {
    logger.info("api.tick", "start");
    try {
      const { searchParams } = new URL(req.url);
      const cookieClientId = (await cookies()).get("clientId")?.value || null;
      const clientId = searchParams.get("clientId") ?? cookieClientId;
      if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

      if (!isDemoOn()) {
        return NextResponse.json({ ok: true, demo: "disabled" });
      }

      let recsEmitted = 0;

      const chaos = isChaosMode(searchParams);
      const baseUrl: string = await  resolveBaseUrl();
      const rng = rngFromParams(searchParams);
      const rand = () => (rng ? rng() : Math.random());
      const R = (min:number, max:number) => min + rand()*(max-min);
      const Ri = (min:number, max:number) => Math.floor(R(min,max));
      const Rp = (p=0.5) => rand() < p;

      const campaigns = await prisma.campaign.findMany({ where: { clientId }, select: { id: true, channel: true, name: true } });
      if (campaigns.length === 0) return NextResponse.json({ ok: true, note: "no campaigns" });

      // 1) шевелим часть кампаний
      const subset = campaigns.sort(() => Math.random()-0.5).slice(0, Math.max(1, Math.round(campaigns.length*0.3)));
      await Promise.all(subset.map(c => randomUpdate(c.id, chaos, rng)));

      for (const c of subset) {
        const res = await emitRecommendationsForCampaign(clientId, c.id, baseUrl, { chaos});
        if (res?.items) recsEmitted += res.items;
      }

      // 2) c вероятностью 30% — создаём 1 новую кампанию
      if (rand() < (chaos ? 0.6 : 0.3)) {
        const baseName = Rp(0.5) ? "Prospecting" : "Retargeting";
        const ch = Rp(0.5) ? "Google Ads" : "Meta Ads";
        const c = await prisma.campaign.create({
          data: { clientId, channel: ch, name: `${baseName} ${Date.now()%1000}`, status: "Active", notes: [] }
        });
        const r2 = await emitRecommendationsForCampaign(clientId, c.id, baseUrl, { chaos });
        if (r2?.items) recsEmitted += r2.items;
        await prisma.campaignEvent.create({ data: { campaignId: c.id, type: "created", ts: new Date(), data: {} } });
        // создаём «вчера/сегодня» метрики
        const today = new Date(); today.setUTCHours(0,0,0,0);
        const dates = [new Date(today.getTime() - 86400000), today];
        await prisma.metricDaily.createMany({
          data: dates.map(d => ({
            campaignId: c.id, date: d,
            impressions: Ri(4000, 12000),
            clicks: Ri(200, 700),
            spend: String(R(80, 330).toFixed(2)),
            conversions: Rp(0.7) ? Ri(5, 30) : 0,
            revenue: String(R(200, 1100).toFixed(2)),
            frequency: "2.0", ctr: "0.0300",
          })),
        });
      }

      // 3) иногда — предлагаем рекомендации через ваш /api/recommendations/run
      if (Math.random() < 0.5) {
        const target = subset[0];
        const items = [{
          clientId,
          channel: "meta_ads",
          entityType: "campaign",
          campaignId: target.id,
          actionType: Math.random()<0.5 ? "scale_up" : "reallocate_budget",
          payload: Math.random()<0.5 ? { pct: 15 } : { from: "low_roas", to: "top_roas", share: 0.1 },
          reason: { rules: ["demo_random_uplift"] },
          priority: Math.round(50 + Math.random()*50),
        }];
        const h = headers();
        const host = (await h).get("x-forwarded-host") ?? (await h).get("host");
        const proto = (await h).get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
        const base =
          process.env.NEXT_PUBLIC_BASE_URL
          ?? (host ? `${proto}://${host}` : `http://localhost:${process.env.PORT ?? 3000}`);

        const url = `${base}/api/recommendations/run`;

        try {
          await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items }),
            // при желании: next: { revalidate: 0 },
          });
        } catch (e) {
          console.warn("[simulate/tick] recommendations/run failed:", e);
          // не роняем тик — просто логируем
        }
      }

      logger.info("api.tick", "subset updated", { subset: subset.map(s => s.id), recsEmitted });
      return NextResponse.json({ ok: true, updated: subset.length, recsEmitted, chaos, seed: searchParams.get("seed") });
    } catch (e) {
      logger.error("api.tick", "failed", { error: String(e) });
      return NextResponse.json({ ok: false, error: "tick_failed" }, { status: 500 });
    }
  });
}
