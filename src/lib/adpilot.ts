export type Channel = "Google Ads" | "Meta Ads";

export interface CampaignDTO {
  id: string;
  channel: Channel;
  name: string;
  status: "Active" | "Learning" | "Paused";
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  revenue: number;
  frequency: number;
  ctr: number;
  notes?: string[];
}

const MOCK_CAMPAIGNS: CampaignDTO[] = [
  {
    id: "g-1",
    channel: "Google Ads",
    name: "Brand Search PL",
    status: "Active",
    spend: 1240.5,
    clicks: 3200,
    impressions: 120000,
    conversions: 96,
    revenue: 7420,
    frequency: 1.2,
    ctr: 0.026,
    notes: ["Stable ROAS", "Low CPA"],
  },
  {
    id: "m-1",
    channel: "Meta Ads",
    name: "Prospecting - Lookalike 1%",
    status: "Active",
    spend: 2100,
    clicks: 5100,
    impressions: 390000,
    conversions: 58,
    revenue: 5200,
    frequency: 2.7,
    ctr: 0.013,
    notes: ["Fatigue risk: high freq", "ROAS below target"],
  },
  {
    id: "g-2",
    channel: "Google Ads",
    name: "Performance Max EU",
    status: "Learning",
    spend: 3120,
    clicks: 4200,
    impressions: 210000,
    conversions: 72,
    revenue: 6100,
    frequency: 1.1,
    ctr: 0.02,
    notes: ["In Learning", "Give 3-5 days"],
  },
  {
    id: "m-2",
    channel: "Meta Ads",
    name: "Retargeting 30d",
    status: "Active",
    spend: 780,
    clicks: 2200,
    impressions: 54000,
    conversions: 85,
    revenue: 6900,
    frequency: 1.8,
    ctr: 0.041,
    notes: ["High ROAS", "Scale opportunity"],
  },
];

export type FetchFilters = {
  channel?: Channel;
  q?: string;
};

export async function getCampaigns(filters: FetchFilters = {}): Promise<CampaignDTO[]> {
  // эмулируем сеть
  await new Promise(res => setTimeout(res, 500));
  const { channel, q } = filters;

  return MOCK_CAMPAIGNS.filter(c => {
    const okChannel = !channel || c.channel === channel;
    const okQuery = !q || c.name.toLowerCase().includes(q.toLowerCase());
    return okChannel && okQuery;
  });
}
