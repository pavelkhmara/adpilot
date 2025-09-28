import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/db";

type Provider = "GOOGLE_ADS" | "META_ADS";

function normalizeProvider(slug: string | undefined): Provider | null {
  if (!slug) return null;
  const s = slug.toLowerCase();
  if (s === "google") return "GOOGLE_ADS";
  if (s === "meta") return "META_ADS";
  return null;
}

export async function POST(
  req: Request,
  context: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider: providerSlug } = await context.params;
    const provider = normalizeProvider(providerSlug);
    if (!provider) {
      return NextResponse.json({ error: "Unknown provider, expected 'google' or 'meta'" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      await prisma.client.create({
        data: {
          key: ['tape','kolo','lapa','milo','zora'][Math.random() * 5 | 0] + (Math.random() * 100 | 0),
          name: ['Big','New','The','Mega','Premium'][Math.random() * 5 | 0] + ' ' + ['Service','Solution','Company','Business','PRO Group'][Math.random() * 5 | 0],
        },
      });
    }

    const found = await prisma.connection.findFirst({
      where: { clientId, provider },
      select: { id: true },
    });

    const externalAccountRef =
      provider === "GOOGLE_ADS" ? "demo-google-account" : "demo-meta-account";

    if (found) {
      await prisma.connection.update({
        where: { id: found.id },
        data: {
          status: "connected",
          mode: "demo",
          externalAccountRef,
        },
      });
    } else {
      await prisma.connection.create({
        data: {
          clientId,
          provider,
          status: "connected",
          mode: "demo",
          externalAccountRef,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("POST /api/connections/:provider/demo error:", error);
    return NextResponse.json({ error: "Internal Server Error: " + error?.message }, { status: 500 });
  }
}
