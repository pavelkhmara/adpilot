import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cookieClientId = (await cookies()).get("clientId")?.value || null;
    const clientId = searchParams.get("clientId") ?? cookieClientId;
    const campaignId = searchParams.get("campaignId");

    if (!clientId && !campaignId) {
      return NextResponse.json({ error: "clientId or campaignId is required" }, { status: 400 });
    }

    const where = campaignId
      ? { campaignId }
      : { campaign: { clientId: clientId! } }; // фильтр по связи

    const items = await prisma.recommendation.findMany({
      where,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 100,
      include: {
        campaign: { select: { id: true, name: true } }, // чтобы видеть имя кампании
      },
    });

    return NextResponse.json({ items });
  } catch (err) {
    console.error("GET /api/recommendations error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
