import { NextResponse } from "next/server";
import { CampaignListResponse, ListQuery } from "../../../lib/contracts/campaigns";
import { listCampaigns } from "../../../server/campaigns/service";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = Object.fromEntries(url.searchParams.entries());

  // get partial request (all filters are optional, except clientId)
  const q = ListQuery.partial().parse(raw);
  if (!q.clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  const items = await listCampaigns({
    clientId: q.clientId,
    status: q.status,
    channel: q.channel,
    search: q.search,
    limit: q.pageSize ?? 200,
    offset: q.page ? (q.page - 1) * (q.pageSize ?? 200) : 0,
  });

  const payload: CampaignListResponse = CampaignListResponse.parse({
    items: items.items,
    generatedAt: items.generatedAt,
    timezoneUsed: "Europe/Warsaw",
    metricsSource: "platform",
  });

  return NextResponse.json(payload);
}



// import { NextRequest, NextResponse } from "next/server";
// import { fetchCampaigns } from "../../../server/campaigns/service";
// import { Channel } from "../../../lib/types";
// import { prisma } from "../../../lib/db";
// import { cookies } from "next/headers";

// const isCuid = (v?: string | null) => !!v && /^c[a-z0-9]{24,}$/i.test(v);


// // --- handler ----------------------------------------------------

// export async function GET(req: NextRequest) {
//   try {
//     const sp = req.nextUrl.searchParams;
//     const cookieClientId = (await cookies()).get("clientId")?.value || null;

//     // 🟢 принимаем и ?client=, и ?clientId=
//     const clientParam = sp.get("client") ?? sp.get("clientId") ?? cookieClientId;
//     if (!clientParam) {
//       return NextResponse.json(
//         { error: "client is required (?client=acme|?clientId=<id>) or via cookie" },
//         { status: 400 }
//       );
//     }

//     // если пришёл cuid — используем как есть; если ключ — ищем id по key
//     const clientRowId = isCuid(clientParam)
//       ? clientParam
//       : (await prisma.client.findUnique({ where: { key: clientParam }, select: { id: true } }))?.id;

//     if (!clientRowId) {
//       return NextResponse.json(
//         { error: `client '${clientParam}' not found` },
//         { status: 404 }
//       );
//     }

//     // собери остальные фильтры как у тебя было...
//     const channel = sp.get("channel") as Channel || undefined;
//     const q = sp.get("q") || undefined;
//     const dateFrom = sp.get("from") || undefined;
//     const dateTo = sp.get("to") || undefined;
//     const num = (v: string | null) => (v && Number.isFinite(+v) ? +v : undefined);

//     // const clientId = toClientId(sp.get("client"));
//     // if (!clientId) {
//     //   return NextResponse.json(
//     //     { error: "client is required (acme|orbit|nova|zen)" },
//     //     { status: 400 }
//     //   );
//     // }

//     const filters = {
//       clientId: clientRowId,
//       channel,
//       q,
//       dateFrom,
//       dateTo,
//       // thresholds (optional)
//       lowRoas: num(sp.get("lowRoas")),
//       highRoas: num(sp.get("highRoas")),
//       minSpendForPause: num(sp.get("minSpendForPause")),
//       minConversionsForScale: num(sp.get("minConversionsForScale")),
//       fatigueFreq: num(sp.get("fatigueFreq")),
//       lowCtr: num(sp.get("lowCtr")),
//     } as const;

//     const rows = await fetchCampaigns(filters);
//     return NextResponse.json(rows.items, { status: 200 });
//   } catch (e) {
//     console.error("GET /api/campaigns error:", e);
//     return NextResponse.json(
//       { error: "Failed to fetch campaigns" },
//       { status: 500 }
//     );
//   }
// }
