import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { cookies, headers } from "next/headers";
import { emitRecommendationsForCampaign } from "../../../../server/recommendations/simRules";

async function resolveBaseUrl(): Promise<string> {
  const h = headers();
  const host = (await h).get("x-forwarded-host") ?? (await h).get("host");
  const proto = (await h).get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  return process.env.NEXT_PUBLIC_BASE_URL ?? (host ? `${proto}://${host}` : `http://localhost:${process.env.PORT ?? 3000}`);
}

async function randomUpdate(campaignId: string) {
  const today = new Date(); today.setUTCHours(0,0,0,0);
  // достаём сегодня/вчера — и чуть шевелим
  const last2 = await prisma.metricDaily.findMany({
    where: { campaignId, date: { gte: new Date(today.getTime() - 86400000*1) } },
    orderBy: { date: "asc" },
  });

  const bump = (x: number, relRange = 0.15) => {
    const k = 1 + (Math.random()*2 - 1) * relRange;
    return Math.max(0, x * k);
  };

  for (const row of last2) {
    const spend = bump(Number(row.spend));
    const clicks = Math.round(bump(row.clicks));
    const impr = Math.round(bump(row.impressions, 0.2));
    const conv = Math.max(0, Math.round(bump(row.conversions)));
    const revenue = bump(Number(row.revenue), 0.25);
    const ctr = clicks / Math.max(1, impr);
    const freq = bump(Number(row.frequency), 0.1);

    await prisma.metricDaily.update({
      where: { id: row.id },
      data: {
        spend: String(spend.toFixed(2)),
        clicks, impressions: impr, conversions: conv,
        revenue: String(revenue.toFixed(2)),
        ctr: String(ctr.toFixed(4)),
        frequency: String(freq.toFixed(2)),
      },
    });
  }

  // иногда меняем статус и пишем событие
  if (Math.random() < 0.15) {
    const status = Math.random() < 0.5 ? "Learning" : "Active";
    await prisma.campaign.update({ where: { id: campaignId }, data: { status } });
    await prisma.campaignEvent.create({
      data: { campaignId, type: "status_changed", ts: new Date(), data: { status } },
    }); // модель событий уже есть. :contentReference[oaicite:5]{index=5}
  }
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const cookieClientId = (await cookies()).get("clientId")?.value || null;
  const clientId = searchParams.get("clientId") ?? cookieClientId;
  if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

  const baseUrl: string = await  resolveBaseUrl();

  const campaigns = await prisma.campaign.findMany({ where: { clientId }, select: { id: true, channel: true, name: true } });
  if (campaigns.length === 0) return NextResponse.json({ ok: true, note: "no campaigns" });

  // 1) шевелим часть кампаний
  const subset = campaigns.sort(() => Math.random()-0.5).slice(0, Math.max(1, Math.round(campaigns.length*0.3)));
  await Promise.all(subset.map(c => randomUpdate(c.id)));

  for (const c of subset) {
    await emitRecommendationsForCampaign(clientId, c.id, baseUrl);
  }

  // 2) c вероятностью 30% — создаём 1 новую кампанию
  if (Math.random() < 0.3) {
    const baseName = Math.random() < 0.5 ? "Prospecting" : "Retargeting";
    const ch = Math.random() < 0.5 ? "Google Ads" : "Meta Ads";
    const c = await prisma.campaign.create({
      data: { clientId, channel: ch, name: `${baseName} ${Date.now()%1000}`, status: "Active", notes: [] }
    });
    await emitRecommendationsForCampaign(clientId, c.id, baseUrl);
    await prisma.campaignEvent.create({ data: { campaignId: c.id, type: "created", ts: new Date(), data: {} } });
    // создаём «вчера/сегодня» метрики
    const today = new Date(); today.setUTCHours(0,0,0,0);
    const dates = [new Date(today.getTime() - 86400000), today];
    await prisma.metricDaily.createMany({
      data: dates.map(d => ({
        campaignId: c.id, date: d,
        impressions: 4000 + (Math.random()*8000|0),
        clicks: 200 + (Math.random()*500|0),
        spend: String((80+Math.random()*250).toFixed(2)),
        conversions: Math.random()<0.7 ? (5+Math.random()*25|0) : 0,
        revenue: String((200+Math.random()*900).toFixed(2)),
        frequency: "2.0", ctr: "0.0300",
      })),
    });
  }

  // 3) иногда — предлагаем рекомендации через ваш /api/recommendations/run
  if (Math.random() < 0.5) {
    const target = subset[0];
    const items = [{
      clientId,
      channel: "meta",
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

  return NextResponse.json({ ok: true, updated: subset.length });
}
