import { prisma } from "../../lib/db";
import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import type { ListCampaignsResponse, ServerFetchFilters } from "./dto";
import type { CampaignRow } from "../../lib/types";

const toNum = (v: number | Decimal | null | undefined) =>
  v == null ? 0 : Number(v);

export async function fetchCampaigns(filters: ServerFetchFilters): Promise<ListCampaignsResponse> {
  const {
    clientId,
    channel,
    q,
    dateFrom,
    dateTo,
    limit = 50,
    offset = 0,
  } = filters;

  if (!clientId) return { items: [] };

  const whereCampaign: Prisma.CampaignWhereInput = {
    clientId,
    ...(channel ? { channel } : {}),
    ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
  };

  const campaigns = await prisma.campaign.findMany({
    where: whereCampaign,
    select: { id: true, name: true, channel: true, status: true },
    orderBy: { createdAt: "desc" },
    skip: offset,
    take: limit,
  });

  if (campaigns.length === 0) return { items: [] };

  const whereDaily: Prisma.MetricDailyWhereInput = {
    campaignId: { in: campaigns.map(c => c.id) },
    ...(dateFrom ? { date: { gte: new Date(dateFrom) } } : {}),
    ...(dateTo ? { date: { ...(dateFrom ? { gte: new Date(dateFrom) } : {}), lte: new Date(dateTo) } } : {}),
  };

  const sums = await prisma.metricDaily.groupBy({
    by: ["campaignId"],
    where: whereDaily,
    _sum: {
      impressions: true,
      clicks: true,
      spend: true,
      conversions: true,
      revenue: true,
    },
    _avg: { frequency: true, ctr: true },
  });

  const map = new Map(sums.map(s => [s.campaignId, s]));

  const items: CampaignRow[] = campaigns.map(c => {
    const s = map.get(c.id);
    const impressions = toNum(s?._sum.impressions);
    const clicks = toNum(s?._sum.clicks);
    const spend = toNum(s?._sum.spend);
    const conversions = toNum(s?._sum.conversions);
    const revenue = toNum(s?._sum.revenue);

    // const ctr = impressions > 0 ? clicks / impressions : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    const roas = spend > 0 ? revenue / spend : 0;
    const frequency = Number(s?._avg.frequency ?? 0);
    const ctr = Number(s?._avg.ctr ?? 0);

    return {
      id: c.id,
      name: c.name,
      channel: c.channel as CampaignRow["channel"],
      status: c.status as CampaignRow["status"],
      impressions,
      clicks,
      spend,
      conversions,
      revenue,
      ctr,
      cpc,
      roas,
      frequency,
    };
  });

  return { items };
}



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
