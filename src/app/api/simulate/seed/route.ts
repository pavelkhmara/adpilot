import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { cookies } from "next/headers";
import { emitRecommendationsForCampaign } from "../../../../server/recommendations/simRules";
import { headers } from "next/headers";
import { isDemoOn, isChaosMode, rngFromParams } from "../../../../server/sim/common";
import { logger } from "../../../../server/debug/logger";
import { withRequestContext } from "../../../../server/debug/withRequestContext";

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
        const baseUrl: string = await resolveBaseUrl();

        const mul = chaos ? 1.5 : 1.0;

        const rng = rngFromParams(searchParams);
        const R = (min: number, max: number) => {
          const r = rng ? rng() : Math.random();
          return min + r * (max - min);
        };
        const Ri = (min: number, max: number) => Math.floor(R(min, max));
        const Rp = (p = 0.5) => (rng ? rng() : Math.random()) < p;

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
              const spend = R(50, 450) * mul;
              const clicks = Math.round(spend * R(0.8, 1.4) * mul);
              const impressions = Math.round(clicks * R(20, 60) * mul);
              const conv = Rp(0.6) ? Math.round(clicks * R(0.02, 0.05) * (chaos ? 1.2 : 1)) : 0;
              const revenue = spend * (chaos ? R(1.4, 3.2) : R(1.6, 4.0));
              const ctr = clicks / Math.max(1, impressions);
              const frequency = R(1.0, 4.0);

              const ch = Rp(0.5) ? "Google Ads" : "Meta Ads";
              const name = `${ch === "Google Ads" ? "Brand" : "Retargeting"} ${i + 1}`;
              const statusPool = ["Active","Learning","Paused"];
              const status = statusPool[Ri(0, statusPool.length)];

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
            const r = await emitRecommendationsForCampaign(clientId, c.id, baseUrl, { chaos });
            if (r?.items) recsEmitted += r.items;
          }
          return createdIds;
        });

        logger.info("api.seed", "created", { n, campaignsCreated: created.length, recsEmitted });
        return NextResponse.json({ ok: true, campaignsCreated: created.length, recsEmitted, chaos, seed: searchParams.get("seed") });
      } catch (e) {
      logger.error("api.tick", "failed", { error: String(e) });
      return NextResponse.json({ ok: false, error: "tick_failed" }, { status: 500 });
    }
  });
}
