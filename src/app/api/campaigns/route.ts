import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Channel, FetchFilters } from "@/lib/adpilot";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientKey = searchParams.get("client") ?? "acme";
    const channel = searchParams.get("channel") as Channel | null;
    const q = searchParams.get("q") ?? undefined;
    const dateFrom = searchParams.get("dateFrom") ?? undefined;
    const dateTo = searchParams.get("dateTo") ?? undefined;

    // 1) Client by key
    const client = await prisma.client.findUnique({ where: { key: clientKey } });
    if (!client) {
      return NextResponse.json([], { status: 200 });
    }

    // 2) where for campaigns
    const whereCampaign: FetchFilters = {
      clientId: client.id,
      ...(channel ? { channel } : {}),
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    };

    // 3) Dates period
    const from = dateFrom ? new Date(dateFrom + "T00:00:00Z") : undefined;
    const to = dateTo ? new Date(dateTo + "T23:59:59Z") : undefined;

    // 4) Pick campaigns and daily metrics
    const campaigns = await prisma.campaign.findMany({
      where: whereCampaign,
      include: {
        metrics: {
          where: {
            ...(from ? { date: { gte: from } } : {}),
            ...(to ? { date: { lte: to } } : {}),
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // 5) Aggregation
    const result = campaigns.map((c) => {
      const m = c.metrics;
      const sum = m.reduce(
        (acc, x) => {
          acc.impressions += x.impressions;
          acc.clicks += x.clicks;
          acc.spend += Number(x.spend);
          acc.conversions += x.conversions;
          acc.revenue += Number(x.revenue);
          acc.frequency += Number(x.frequency);
          acc.ctr += Number(x.ctr);
          return acc;
        },
        { impressions: 0, clicks: 0, spend: 0, conversions: 0, revenue: 0, frequency: 0, ctr: 0 }
      );
      const days = Math.max(1, m.length);
      return {
        id: c.id,
        channel: c.channel as Channel,
        name: c.name,
        status: c.status as "Active" | "Learning" | "Paused",
        impressions: sum.impressions,
        clicks: sum.clicks,
        spend: +sum.spend.toFixed(2),
        conversions: sum.conversions,
        revenue: +sum.revenue.toFixed(2),
        frequency: +(sum.frequency / days).toFixed(2),
        ctr: +(sum.ctr / days).toFixed(4),
        notes: c.notes,
      };
    });

    return NextResponse.json(result, { status: 200 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    console.error("GET /api/campaigns error:", e);
    return NextResponse.json(
      { error: "Failed to fetch campaigns", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}