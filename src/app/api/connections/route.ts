import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";
import { cookies } from "next/headers";


type Provider = "GOOGLE_ADS" | "META_ADS";
type ConnectionStatus = "connected" | "disconnected";
type ConnectionMode = "demo" | "live";

const AVAILABLE_PROVIDERS: Provider[] = ["GOOGLE_ADS", "META_ADS"];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cookieClientId = (await cookies()).get("clientId")?.value || null;
    const clientId = searchParams.get("clientId") ?? cookieClientId;

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    const rows = await prisma.connection.findMany({
      where: { clientId },
      select: {
        provider: true,
        status: true,
        mode: true,
        externalAccountRef: true,
      },
    });

    const existing = new Map(rows.map(r => [r.provider, r]));

    const items = AVAILABLE_PROVIDERS.map((p) => {
      const row = existing.get(p);
      if (row) return row;
      return {
        provider: p,
        status: "disconnected" as ConnectionStatus,
        mode: "demo" as ConnectionMode,
        externalAccountRef: null as string | null,
      };
    });

    return NextResponse.json({ items });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("GET /api/connections error:", error);
    return NextResponse.json({ error: "Internal Server Error: " + error?.message }, { status: 500 });
  }
}
