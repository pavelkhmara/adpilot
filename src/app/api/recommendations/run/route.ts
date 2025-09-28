import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

export async function POST(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const clientId = sp.get("clientId");
    const campaignId = sp.get("campaignId");

    if (!clientId && !campaignId) {
      return NextResponse.json({ error: "clientId or campaignId is required" }, { status: 400 });
    }

    // Собираем список кампаний-мишеней
    let campaigns: { id: string; name: string | null }[] = [];

    if (campaignId) {
      const c = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { id: true, name: true },
      });
      if (!c) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      campaigns = [c];
    } else if (clientId) {
      campaigns = await prisma.campaign.findMany({
        where: { clientId },
        select: { id: true, name: true },
        take: 5,
      });
      if (campaigns.length === 0) {
        return NextResponse.json({ error: "No campaigns for this client" }, { status: 404 });
      }
    }

    // Демо-рекомендации (по кампании)
    const data = campaigns.map((c) => ({
      campaignId: c.id,          
      entityType: "campaign",
      entityId: c.id,
      actionType: "DecreaseBudgetByPct",
      payload: { pct: 10 },
      reason: { rules: ["demo_rising_cpa"] },
      priority: 50,
      status: "proposed",
    }));

    await prisma.recommendation.createMany({ data });
    return NextResponse.json({ ok: true, created: data.length });
  } catch (err) {
    console.error("POST /api/recommendations/run error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
