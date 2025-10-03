import { prisma } from "../../lib/db";
import { CampaignListItem } from "../../lib/contracts/campaigns";
import { z } from "zod";
import { Prisma } from "@prisma/client";

// ——— простые хелперы дат (работаем по дате в UTC, где MetricDaily.date — полночь UTC)
function startOfUTC(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}
function rangeLastNDays(n: number) {
  // today включительно
  const today = startOfUTC(new Date());
  const from = addDays(today, -(n - 1));
  const toExcl = addDays(today, 1); // полуинтервал [from, to)
  return { from, toExcl, today };
}

type ListArgs = {
  clientId: string;
  status?: string[];
  channel?: string[];
  search?: string;
  limit?: number;
  offset?: number;
};

type MetricSum = {
  impressions: number | Prisma.Decimal | null;
  clicks: number | Prisma.Decimal | null;
  spend: number | Prisma.Decimal | null;
  conversions: number | Prisma.Decimal | null;
  revenue: number | Prisma.Decimal | null;
};

const toNum = (v: number | Prisma.Decimal | null | undefined) =>
  v == null ? 0 : Number(v);

export async function listCampaigns(args: ListArgs) {
  const { from: d7from, toExcl: d7to } = rangeLastNDays(7);
  const { from: d30from, toExcl: d30to } = rangeLastNDays(30);
  const { from: tFrom, toExcl: tTo } = rangeLastNDays(1);

  // 1) campaigns basic list (light select)
  const campaigns = await prisma.campaign.findMany({
    where: {
      clientId: args.clientId,
      ...(args.status?.length ? { status: { in: args.status } } : {}),
      ...(args.channel?.length ? { channel: { in: args.channel } } : {}),
      ...(args.search
        ? { name: { contains: args.search, mode: "insensitive" } }
        : {}),
    },
    select: {
      id: true,
      name: true,
      channel: true,
      status: true,
      updatedAt: true,
      createdAt: true,
    },
    orderBy: { updatedAt: "desc" },
    skip: args.offset ?? 0,
    take: args.limit ?? 200,
  });

  const ids = campaigns.map(c => c.id);
  if (ids.length === 0) {
    return { items: [] as typeof items, generatedAt: new Date().toISOString() };
  }

  // 2) aggregators KPI today / 7 / 30
  // MetricDaily: { date: Date (UTC day), campaignId, impressions, clicks, spend, conversions, revenue }
  const md = await prisma.metricDaily.groupBy({
    by: ["campaignId"],
    _sum: { impressions: true, clicks: true, spend: true, conversions: true, revenue: true },
    where: { campaignId: { in: ids }, date: { gte: tFrom, lt: tTo } },
  });
  const md7 = await prisma.metricDaily.groupBy({
    by: ["campaignId"],
    _sum: { impressions: true, clicks: true, spend: true, conversions: true, revenue: true },
    where: { campaignId: { in: ids }, date: { gte: d7from, lt: d7to } },
  });
  const md30 = await prisma.metricDaily.groupBy({
    by: ["campaignId"],
    _sum: { impressions: true, clicks: true, spend: true, conversions: true, revenue: true },
    where: { campaignId: { in: ids }, date: { gte: d30from, lt: d30to } },
  });

  const todayBy = Object.fromEntries(
    md.map(r => [r.campaignId, r._sum])
  );
  const d7By = Object.fromEntries(
    md7.map(r => [r.campaignId, r._sum])
  );
  const d30By = Object.fromEntries(
    md30.map(r => [r.campaignId, r._sum])
  );

  // 3) 7 days sparkline (spend/conv/roas by day)
  const sparkRaw = await prisma.metricDaily.findMany({
    where: { campaignId: { in: ids }, date: { gte: d7from, lt: d7to } },
    select: { campaignId: true, date: true, spend: true, conversions: true, revenue: true },
    orderBy: [{ campaignId: "asc" }, { date: "asc" }],
  });
  const sparkBy = new Map<string, { spend: number[]; conv: number[]; roas: number[] }>();
  for (const c of campaigns) {
    sparkBy.set(c.id, { spend: [], conv: [], roas: [] });
  }
  // prepare calendar of last 7 days to flat spaces
  const days: string[] = [];
  for (let i = 0; i < 7; i++) days.push(addDays(d7from, i).toISOString().slice(0, 10));

  const group = new Map<string, Map<string, { spend: number; conv: number; rev: number }>>();
  for (const row of sparkRaw) {
    const key = row.campaignId;
    const day = row.date.toISOString().slice(0, 10);
    if (!group.has(key)) group.set(key, new Map());
    group.get(key)!.set(day, { spend: Number(row.spend || 0), conv: Number(row.conversions || 0), rev: Number(row.revenue || 0) });
  }
  for (const id of ids) {
    const g = group.get(id);
    const vec = sparkBy.get(id)!;
    for (const d of days) {
      const v = g?.get(d) ?? { spend: 0, conv: 0, rev: 0 };
      vec.spend.push(v.spend);
      vec.conv.push(v.conv);
      vec.roas.push(v.spend > 0 ? v.rev / v.spend : 0);
    }
  }

  // 4) last (the most priority) recommendation of campaign
  const latest = await prisma.recommendation.findMany({
    where: { campaignId: { in: ids }, status: { in: ["proposed", "applied"] } },
    select: { id: true, type: true, priorityScore: true, campaignId: true },
    orderBy: [{ priorityScore: "desc" }, { createdAt: "desc" }],
  });

  // get first campaign
  const latestBy = new Map<string, { id: string; type: string; priority: number }>();
  for (const r of latest) {
    if (!r.campaignId) continue;
    if (!latestBy.has(r.campaignId)) {
      latestBy.set(r.campaignId, {
        id: r.id,
        type: r.type,
        priority: Number(r.priorityScore || 0),
      });
    }
  }

  const plans = await prisma.campaignPlanMonthly.findMany({
    where: { campaignId: { in: ids } },
    orderBy: [{ month: "desc" }],
  });
  const planBy = new Map<string, { month: string; amount: number; currency: string }>();
  for (const p of plans) {
    if (!planBy.has(p.campaignId)) {
      planBy.set(p.campaignId, {
        month: String(p.month),
        amount: Number(p.plannedSpend || 0),
        currency: Math.random() > 0.5 ? "USD" : "EUR",
      });
    }
  }

  // 5) pacing (today snapshot)
  const pacing = await prisma.pacingSnapshot.findMany({
    where: { campaignId: { in: ids } },
    orderBy: [{ date: "desc" }],
    take: ids.length * 1,
  });
  const pacingBy = new Map<string, { expectedToDate: number; actualToDate: number; delta: number; planMonth?: string }>();
  for (const p of pacing) {
    pacingBy.set(p.campaignId, {
      expectedToDate: Number(p.expectedSpendToDate || 0),
      actualToDate: Number(p.actualSpendToDate || 0),
      delta: Number(p.delta || 0),
      planMonth: String(p.date) ?? undefined,
    });
  }

  // 6) final list build
  const items = campaigns.map((c) => {
    const agg = (s?: MetricSum) => {
      if (!s) return undefined;
      const impressions = toNum(s.impressions);
      const clicks = toNum(s.clicks);
      const spend = toNum(s.spend);
      const revenue = toNum(s.revenue);
      const conv = toNum(s.conversions);
      return {
        impressions,
        clicks,
        spend,
        conv,
        revenue,
        cpa: conv > 0 ? spend / conv : null,
        roas: spend > 0 ? revenue / spend : null,
      };
    };

    const today = agg(todayBy[c.id]);
    const d7 = agg(d7By[c.id]);
    const d30 = agg(d30By[c.id]);
    const spark = sparkBy.get(c.id)!;
    const latestRec = latestBy.get(c.id);

    const p = pacingBy.get(c.id) ?? null;
    const plan = planBy.get(c.id);

    type CampaignListItemType = z.infer<typeof CampaignListItem>;
    const dto: CampaignListItemType = {
      id: c.id,
      name: c.name,
      channel: c.channel,
      status: c.status,
      badges: {
        learning: false,
        limitedByBudget: false,
        limitedByBid: false,
        policyIssues: undefined,
      },
      budget: null,
      today,
      d7,
      d30,
      pacing: p ? {
        expectedToDate: p.expectedToDate,
        actualToDate: p.actualToDate,
        delta: p.delta,
        plan: plan ? { month: plan.month, amount: plan.amount, currency: plan.currency } : null,
      } : null,
      lastChangeAt: c.updatedAt?.toISOString() ?? null,
      lastSyncAt: null,
      latestRecommendation: latestRec ? { id: latestRec.id, type: latestRec.type, priority: latestRec.priority } : null,
      sparkSpend7: spark.spend,
      sparkConv7: spark.conv,
      sparkRoas7: spark.roas,
    };

    // строгая проверка схемой — бросит, если что-то не так
    return CampaignListItem.parse(dto);
  });

  return { items, generatedAt: new Date().toISOString() };
}





//// V2
// import { prisma } from "../../lib/db";
// import { Prisma } from "@prisma/client";
// import { Decimal } from "@prisma/client/runtime/library";
// import type { ListCampaignsResponse, ServerFetchFilters } from "./dto";
// import type { CampaignRow } from "../../lib/types";

// const toNum = (v: number | Decimal | null | undefined) =>
//   v == null ? 0 : Number(v);

// export async function fetchCampaigns(filters: ServerFetchFilters): Promise<ListCampaignsResponse> {
//   const {
//     clientId,
//     channel,
//     q,
//     dateFrom,
//     dateTo,
//     limit = 50,
//     offset = 0,
//   } = filters;

//   if (!clientId) return { items: [] };

//   const whereCampaign: Prisma.CampaignWhereInput = {
//     clientId,
//     ...(channel ? { channel } : {}),
//     ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
//   };

//   const campaigns = await prisma.campaign.findMany({
//     where: whereCampaign,
//     select: { id: true, name: true, channel: true, status: true },
//     orderBy: { createdAt: "desc" },
//     skip: offset,
//     take: limit,
//   });

//   if (campaigns.length === 0) return { items: [] };

//   const whereDaily: Prisma.MetricDailyWhereInput = {
//     campaignId: { in: campaigns.map(c => c.id) },
//     ...(dateFrom ? { date: { gte: new Date(dateFrom) } } : {}),
//     ...(dateTo ? { date: { ...(dateFrom ? { gte: new Date(dateFrom) } : {}), lte: new Date(dateTo) } } : {}),
//   };

//   const sums = await prisma.metricDaily.groupBy({
//     by: ["campaignId"],
//     where: whereDaily,
//     _sum: {
//       impressions: true,
//       clicks: true,
//       spend: true,
//       conversions: true,
//       revenue: true,
//     },
//     _avg: { frequency: true, ctr: true },
//   });

//   const map = new Map(sums.map(s => [s.campaignId, s]));

//   const items: CampaignRow[] = campaigns.map(c => {
//     const s = map.get(c.id);
//     const impressions = toNum(s?._sum.impressions);
//     const clicks = toNum(s?._sum.clicks);
//     const spend = toNum(s?._sum.spend);
//     const conversions = toNum(s?._sum.conversions);
//     const revenue = toNum(s?._sum.revenue);

//     // const ctr = impressions > 0 ? clicks / impressions : 0;
//     const cpc = clicks > 0 ? spend / clicks : 0;
//     const roas = spend > 0 ? revenue / spend : 0;
//     const frequency = Number(s?._avg.frequency ?? 0);
//     const ctr = Number(s?._avg.ctr ?? 0);

//     return {
//       id: c.id,
//       name: c.name,
//       channel: c.channel,
//       status: c.status,
//       impressions,
//       clicks,
//       spend,
//       conversions,
//       revenue,
//       ctr,
//       cpc,
//       roas,
//       frequency,
//     };
//   });

//   return { items };
// }

//// V1
// import { prisma } from "../../lib/db";
// import type { ServerFetchFilters as FetchFilters, ListCampaignsResponse as CampaignDTO } from "./dto";
// import { Channel, Status } from "../../lib/types";
// import { buildRecommendation } from "../../server/campaigns/useRecommendations";

// export async function fetchCampaigns(filters: FetchFilters): Promise<CampaignDTO> {
//   const { client, channel, q, dateFrom, dateTo, ...thr } = filters;

//   function isCuid(v?: string | null) {
//     return !!v && /^c[a-z0-9]{24,}$/i.test(v); // check
//   }

//   const whereByClient =
//     client
//       ? (isCuid(client)
//           ? { clientId: client }                   // if have cuid
//           : { client: { key: client as string } }) // if business key ("acme")
//       : {};

//   const campaigns = await prisma.campaign.findMany({
//     where: {
//       ...whereByClient,
//       channel: channel ?? undefined,
//       name: q ? { contains: q, mode: "insensitive" } : undefined,
//     },
//     select: { id: true, name: true, channel: true, status: true },
//   });


//   if (campaigns.length === 0) return {items: []};

//   // агрегаты по датам (MetricDaily)
//   const metrics = await prisma.metricDaily.groupBy({
//     by: ["campaignId"],
//     where: {
//       campaign: { clientId: client, channel: channel ?? undefined, name: q ? { contains: q, mode: "insensitive" } : undefined },
//       date: {
//         gte: dateFrom ? new Date(dateFrom + "T00:00:00Z") : undefined,
//         lte: dateTo ? new Date(dateTo + "T23:59:59Z") : undefined,
//       },
//     },
//     _sum: {
//       impressions: true, clicks: true, spend: true, conversions: true, revenue: true, // freq/ctr усредним ниже
//     },
//     _avg: { frequency: true, ctr: true },
//   });

//   const byId = new Map(metrics.map(m => [m.campaignId, m]));

//   const rows: CampaignDTO = { items: []};

//   rows.items = campaigns.map(c => {
//     const m = byId.get(c.id);
//     const impressions = Number(m?._sum.impressions ?? 0);
//     const clicks = Number(m?._sum.clicks ?? 0);
//     const spend = Number(m?._sum.spend ?? 0);
//     const conversions = Number(m?._sum.conversions ?? 0);
//     const revenue = Number(m?._sum.revenue ?? 0);
//     const frequency = Number(m?._avg.frequency ?? 0);
//     const ctr = Number(m?._avg.ctr ?? 0);

//     return {
//       id: c.id,
//       name: c.name,
//       channel: c.channel as Channel,
//       status: c.status as Status,

//       impressions,
//       clicks,
//       spend,
//       conversions,
//       revenue,

//       ctr,
//       frequency,
//       recommendation: buildRecommendation({
//         spend, revenue, conversions, ctr, frequency, channel: c.channel as Channel, ...thr,
//       }),
//     };
//   });

//   return rows;
// }
