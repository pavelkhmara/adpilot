import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";


export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Channel = "Google Ads" | "Meta Ads";
type Trend = "up" | "down" | "flat";
type RecType = "pause" | "scale" | "creative" | "none";
type Status = "Active" | "Learning" | "Paused";

type Row = {
  id: string;
  channel: Channel;
  name: string;
  status: Status;
  // current period
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  revenue: number;
  frequency: number; // avg
  ctr: number;       // avg
  // previous period
  roasPrev?: number;
  cpaPrev?: number;
  ctrPrev?: number;
  // trends
  roasTrend?: Trend;
  cpaTrend?: Trend;
  ctrTrend?: Trend;
  // recommendation
  recommendation?: {
    type: RecType;
    title: string;
    reason: string;
    risk?: string;
    action?: { kind: "increase_budget"; by?: number } | { kind: "pause" } | { kind: "rotate_creatives" };
  };
  notes?: string[];
};

function calcTrend(curr: number, prev: number | undefined, eps = 1e-9): Trend {
  if (prev == null) return "flat";
  const diff = curr - prev;
  const rel = prev === 0 ? (diff === 0 ? 0 : Infinity) : diff / (prev + eps);
  if (Math.abs(rel) < 0.03) return "flat";
  return rel > 0 ? "up" : "down";
}

function safeAvg(sum: number, n: number) { return n > 0 ? sum / n : 0; }

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientKey = searchParams.get("client") ?? "acme";
    const channel = searchParams.get("channel") as Channel | null;
    const q = searchParams.get("q") ?? undefined;
    const dateFrom = searchParams.get("dateFrom") ?? undefined;
    const dateTo = searchParams.get("dateTo") ?? undefined;

    // thresholds
    const lowRoas = Number(searchParams.get("lowRoas") ?? 1.5);
    const highRoas = Number(searchParams.get("highRoas") ?? 3.0);
    const minSpendForPause = Number(searchParams.get("minSpendForPause") ?? 1000);
    const minConvForScale = Number(searchParams.get("minConvForScale") ?? 50);
    const fatigueFreq = Number(searchParams.get("fatigueFreq") ?? 2.5);
    const lowCtr = Number(searchParams.get("lowCtr") ?? 0.02);

    const client = await prisma.client.findUnique({ where: { key: clientKey } });
    if (!client) return NextResponse.json([], { status: 200 });

    
    const to = dateTo ? new Date(dateTo + "T23:59:59Z") : new Date(); 
    const from = dateFrom ? new Date(dateFrom + "T00:00:00Z") : new Date(new Date().getTime() - 29 * 86400000);
    const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000) + 1);
    const prevTo = new Date(from.getTime() - 86400000);
    const prevFrom = new Date(prevTo.getTime() - (days - 1) * 86400000);

    const whereCampaign: Prisma.CampaignWhereInput = {
      clientId: client.id,
      ...(channel ? { channel } : {}),
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      metrics: {
        some: { date: { gte: from, lte: to } },
      },
    };

    const [curr, prev] = await Promise.all([
      prisma.campaign.findMany({
        where: whereCampaign,
        include: { metrics: { where: { date: { gte: from, lte: to } } } },
        orderBy: { name: "asc" },
      }),
      prisma.campaign.findMany({
        where: {
          clientId: client.id,
          ...(channel ? { channel } : {}),
          ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
        },
        include: { metrics: { where: { date: { gte: prevFrom, lte: prevTo } } } },
        orderBy: { name: "asc" },
      }),
    ]);


    // map prev by id
    const prevMap = new Map<string, typeof prev[number]>();
    prev.forEach(c => prevMap.set(c.id, c));

    const rows: Row[] = curr.map((c) => {
      const m = c.metrics;
      const s = m.reduce(
        (acc, x) => {
          acc.impr += x.impressions;
          acc.click += x.clicks;
          acc.spend += Number(x.spend);
          acc.conv += x.conversions;
          acc.rev += Number(x.revenue);
          acc.freq += Number(x.frequency);
          acc.ctr += Number(x.ctr);
          return acc;
        },
        { impr: 0, click: 0, spend: 0, conv: 0, rev: 0, freq: 0, ctr: 0 }
      );
      const d = Math.max(1, m.length);
      const roas = s.spend > 0 ? s.rev / s.spend : 0;
      const cpa = s.conv > 0 ? s.spend / s.conv : 0;

      const p = prevMap.get(c.id);
      let roasPrev: number | undefined, cpaPrev: number | undefined, ctrPrev: number | undefined;
      if (p) {
        const sp = p.metrics.reduce((acc, x) => {
          acc.spend += Number(x.spend);
          acc.rev += Number(x.revenue);
          acc.conv += x.conversions;
          acc.ctr += Number(x.ctr);
          return acc;
        }, { spend: 0, rev: 0, conv: 0, ctr: 0 });
        const pd = Math.max(1, p.metrics.length);
        roasPrev = sp.spend > 0 ? sp.rev / sp.spend : 0;
        cpaPrev = sp.conv > 0 ? sp.spend / sp.conv : 0;
        ctrPrev = safeAvg(sp.ctr, pd);
      }

      // baseline recommendation
      let recommendation: Row["recommendation"] | undefined;
      const avgFreq = +(s.freq / d).toFixed(2);
      const avgCtr = +(s.ctr / d).toFixed(4);

      if (s.spend >= minSpendForPause && roas < lowRoas) {
        recommendation = {
          type: "pause",
          title: "Pause campaign",
          reason: `ROAS ${roas.toFixed(2)} is lower than threshold ${lowRoas}`,
          risk: "Traffic loss from ineffective sources is minimal.",
          action: { kind: "pause" },
        };
      } else if (roas >= highRoas && s.conv >= minConvForScale) {
        const by = 0.2; // +20% как MVP
        recommendation = {
          type: "scale",
          title: "Increase budget",
          reason: `ROAS ${roas.toFixed(2)} ≥ ${highRoas}, conversions ${s.conv} ≥ ${minConvForScale}`,
          action: { kind: "increase_budget", by },
        };
      } else if (avgFreq >= fatigueFreq || avgCtr < lowCtr) {
        recommendation = {
          type: "creative",
          title: "Redesign creatives",
          reason: avgFreq >= fatigueFreq
            ? `Frequency ${avgFreq} ≥ ${fatigueFreq}`
            : `CTR ${(avgCtr * 100).toFixed(2)}% < ${(lowCtr * 100).toFixed(2)}%`,
          action: { kind: "rotate_creatives" },
        };
      } else {
        recommendation = {
          type: "none",
          title: "Empty notes",
          reason: "Metrics are within thresholds",
        };
      }

      const roasTrend = calcTrend(roas, roasPrev);
      const cpaTrend = calcTrend(cpa, cpaPrev);
      const ctrTrend = calcTrend(avgCtr, ctrPrev);

      return {
        id: c.id,
        channel: c.channel as Channel,
        name: c.name,
        status: c.status as Status,
        impressions: s.impr,
        clicks: s.click,
        spend: +s.spend.toFixed(2),
        conversions: s.conv,
        revenue: +s.rev.toFixed(2),
        frequency: +avgFreq.toFixed(2),
        ctr: +avgCtr.toFixed(4),
        roasPrev,
        cpaPrev,
        ctrPrev,
        roasTrend,
        cpaTrend,
        ctrTrend,
        recommendation,
        notes: c.notes,
      };
    });

    return NextResponse.json(rows, { status: 200 });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("GET /api/campaigns error:", err);
    return NextResponse.json(
      { error: "Failed to fetch campaigns", detail: err.message },
      { status: 500 }
    );
  }
}
