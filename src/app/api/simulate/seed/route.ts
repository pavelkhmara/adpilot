import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { cookies } from "next/headers";
import { emitRecommendationsForCampaign } from "../../../../server/recommendations/simRules";
import { headers } from "next/headers";

function pick<T>(arr: T[]) { return arr[Math.random() * arr.length | 0]; }
const CHANNELS = ["Google Ads","Meta Ads"] as const;
const STATUSES = ["Active","Learning","Paused"] as const;

async function resolveBaseUrl(): Promise<string> {
  const h = headers();
  const host = (await h).get("x-forwarded-host") ?? (await h).get("host");
  const proto = (await h).get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  return process.env.NEXT_PUBLIC_BASE_URL ?? (host ? `${proto}://${host}` : `http://localhost:${process.env.PORT ?? 3000}`);
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const cookieClientId = (await cookies()).get("clientId")?.value || null;
  const clientId = searchParams.get("clientId") ?? cookieClientId;
  if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

  const baseUrl: string = await resolveBaseUrl();

  const n = Number(searchParams.get("n") ?? 8);
  const today = new Date();
  const start = new Date(today); start.setUTCDate(start.getUTCDate() - 30);

  // создаём кампании
  const created = await prisma.$transaction(async (tx) => {
    const createdIds: string[] = [];
    for (let i = 0; i < n; i++) {
      const ch = pick([...CHANNELS]);
      const c = await tx.campaign.create({
        data: {
          clientId, channel: ch, name: `${ch === "Google Ads" ? "Brand" : "Retargeting"} ${i+1}`,
          status: pick([...STATUSES]),
          notes: [],
        },
        select: { id: true }
      });
      createdIds.push(c.id);

      // 30 дней метрик
      const days = [];
      for (let d = 0; d <= 30; d++) {
        const date = new Date(start); date.setUTCDate(start.getUTCDate() + d);
        // лёгкая рандомизация
        const spend = 50 + Math.random()*400;
        const clicks = Math.round(spend * (0.8 + Math.random()*0.6));
        const impressions = clicks * (20 + Math.random()*40);
        const conv = Math.random() < 0.6 ? Math.round(clicks * (0.02 + Math.random()*0.03)) : 0;
        const revenue = spend * (1.6 + Math.random()*2.4);
        const ctr = clicks / Math.max(1, impressions);
        const frequency = 1 + Math.random()*3;

        days.push({
          campaignId: c.id,
          date,
          impressions: Math.round(impressions),
          clicks,
          spend: Number(spend.toFixed(2)),
          conversions: conv,
          revenue: Number(revenue.toFixed(2)),
          frequency: Number(frequency.toFixed(2)),
          ctr: Number(ctr.toFixed(4)),
        });
      }
      await tx.metricDaily.createMany({ data: days });
      await emitRecommendationsForCampaign(clientId, c.id, baseUrl);
    }
    return createdIds;
  });

  return NextResponse.json({ ok: true, campaignsCreated: created.length });
}
