import { NextRequest, NextResponse } from "next/server";
import { fetchCampaigns } from "../../../server/campaigns/service";
import { isValidYmd } from "../../../lib/dates";
import { Channel, ClientId } from "../../../lib/types";
import { prisma } from "../../../lib/db";
import { cookies } from "next/headers";

const isCuid = (v?: string | null) => !!v && /^c[a-z0-9]{24,}$/i.test(v);

// --- helpers ----------------------------------------------------

function toClientId(v: string | null): ClientId | null {
  switch (v) {
    case "acme":
    case "orbit":
    case "nova":
    case "zen":
      return v;
    default:
      return null;
  }
}

function toChannel(v: string | null): Channel | undefined {
  if (!v || v === "All") return undefined;
  if (v === "Google Ads" || v === "Meta Ads") return v;
  return undefined;
}

function num(v: string | null): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function ymd(v: string | null): string | undefined {
  if (!v) return undefined;
  return isValidYmd(v) ? v : undefined;
}

// --- handler ----------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const cookieClientId = (await cookies()).get("clientId")?.value || null;

    // 🟢 принимаем и ?client=, и ?clientId=
    const clientParam = sp.get("client") ?? sp.get("clientId") ?? cookieClientId;
    if (!clientParam) {
      return NextResponse.json(
        { error: "client is required (?client=acme|?clientId=<id>) or via cookie" },
        { status: 400 }
      );
    }

    // если пришёл cuid — используем как есть; если ключ — ищем id по key
    const clientRowId = isCuid(clientParam)
      ? clientParam
      : (await prisma.client.findUnique({ where: { key: clientParam }, select: { id: true } }))?.id;

    if (!clientRowId) {
      return NextResponse.json(
        { error: `client '${clientParam}' not found` },
        { status: 404 }
      );
    }

    // собери остальные фильтры как у тебя было...
    const channel = sp.get("channel") as Channel || undefined;
    const q = sp.get("q") || undefined;
    const dateFrom = sp.get("from") || undefined;
    const dateTo = sp.get("to") || undefined;
    const num = (v: string | null) => (v && Number.isFinite(+v) ? +v : undefined);

    // const clientId = toClientId(sp.get("client"));
    // if (!clientId) {
    //   return NextResponse.json(
    //     { error: "client is required (acme|orbit|nova|zen)" },
    //     { status: 400 }
    //   );
    // }

    const filters = {
      clientId: clientRowId,
      channel,
      q,
      dateFrom,
      dateTo,
      // thresholds (optional)
      lowRoas: num(sp.get("lowRoas")),
      highRoas: num(sp.get("highRoas")),
      minSpendForPause: num(sp.get("minSpendForPause")),
      minConversionsForScale: num(sp.get("minConversionsForScale")),
      fatigueFreq: num(sp.get("fatigueFreq")),
      lowCtr: num(sp.get("lowCtr")),
    } as const;

    const rows = await fetchCampaigns(filters);
    return NextResponse.json(rows.items, { status: 200 });
  } catch (e) {
    console.error("GET /api/campaigns error:", e);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}
