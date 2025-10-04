import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/db";
import { cookies } from "next/headers";

type Provider = "GOOGLE_ADS" | "META_ADS";
function normalizeProvider(slug: string | undefined): Provider | null {
  if (!slug) return null;
  const s = slug.toLowerCase();
  if (s === "google_ads") return "GOOGLE_ADS";
  if (s === "meta_ads") return "META_ADS";
  return null;
}

export async function POST(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  try {
    const { provider: providerSlug } = await ctx.params;
    const provider = normalizeProvider(providerSlug);
    if (!provider) return NextResponse.json({ error: "Unknown provider" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const cookieClientId = (await cookies()).get("clientId")?.value || null;
    const clientId = searchParams.get("clientId") ?? cookieClientId;
    if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });

    const found = await prisma.connection.findFirst({
      where: { clientId, provider },
      select: { id: true },
    });
    if (!found) {
      return NextResponse.json({ ok: true });
    }

    await prisma.connection.update({
      where: { id: found.id },
      data: {
        status: "disconnected",
        externalAccountRef: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/connections/:provider/disconnect error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
