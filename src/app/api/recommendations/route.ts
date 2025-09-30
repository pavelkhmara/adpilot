import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { RecListResponse } from "@/lib/contracts/recommendations";
import { listRecommendations } from "@/server/recommendations/service";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cookieClientId = (await cookies()).get("clientId")?.value || null;
    const clientId = searchParams.get("clientId") ?? cookieClientId;
    const campaignId = searchParams.get("campaignId") || undefined;

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    const items = await listRecommendations({
    clientId,
    campaignId,
  });

  const payload = RecListResponse.parse({
    items,
    generatedAt: new Date().toISOString(),
    timezoneUsed: "Europe/Warsaw",
  });

    return NextResponse.json(payload);
  } catch (err) {
    console.error("GET /api/recommendations error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
