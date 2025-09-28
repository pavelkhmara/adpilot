import { NextResponse } from "next/server";
import { Provider, ConnectionStatus, ConnectionMode } from "@prisma/client";
import { prisma } from "../../../../../lib/db";



function normalizeProvider(slug: string | undefined): Provider | null {
  if (!slug) return null;
  const s = slug.toLowerCase();
  if (s === "google") return Provider.GOOGLE_ADS;
  if (s === "meta") return Provider.META_ADS;
  return null;
}

export async function POST(
  req: Request,
  context: { params: { provider?: string } }
) {
  try {
    const provider = normalizeProvider(context.params?.provider);
    if (!provider) {
      return NextResponse.json({ error: "Unknown provider, expected 'google' or 'meta'" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    const found = await prisma.connection.findFirst({
      where: { clientId, provider },
      select: { id: true },
    });

    const externalAccountRef =
      provider === Provider.GOOGLE_ADS ? "demo-google-account" : "demo-meta-account";

    if (found) {
      await prisma.connection.update({
        where: { id: found.id },
        data: {
          status: ConnectionStatus.connected,
          mode: ConnectionMode.demo,
          externalAccountRef,
        },
      });
    } else {
      await prisma.connection.create({
        data: {
          clientId,
          provider,
          status: ConnectionStatus.connected,
          mode: ConnectionMode.demo,
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
