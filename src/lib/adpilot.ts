
import { prisma } from "@/lib/db";

export type Channel = "Google Ads" | "Meta Ads";
export type ClientId = "acme" | "orbit" | "nova" | "zen" | string;

export interface CampaignDTO {
  id: string;
  channel: Channel;
  name: string;
  status: "Active" | "Learning" | "Paused" | string;
  spend: number;
  clicks: number;
  impressions: number;
  conversions: number;
  revenue: number;
  frequency: number;
  ctr: number;
  notes?: string[];
}

// const BASE: CampaignDTO[] = [
//   { id: "g-1", channel: "Google Ads", name: "Brand Search PL", status: "Active", spend: 1240.5, clicks: 3200, impressions: 120000, conversions: 96, revenue: 7420, frequency: 1.2, ctr: 0.026, notes: ["Stable ROAS", "Low CPA"], },
//   { id: "m-1", channel: "Meta Ads", name: "Prospecting - Lookalike 1%", status: "Active", spend: 2100, clicks: 5100, impressions: 390000, conversions: 58, revenue: 5200, frequency: 2.7, ctr: 0.013, notes: ["Fatigue risk: high freq", "ROAS below target"], },
//   { id: "g-2", channel: "Google Ads", name: "Performance Max EU", status: "Learning", spend: 3120, clicks: 4200, impressions: 210000, conversions: 72, revenue: 6100, frequency: 1.1, ctr: 0.02, notes: ["In Learning", "Give 3-5 days"], },
//   { id: "m-2", channel: "Meta Ads", name: "Retargeting 30d", status: "Active", spend: 780, clicks: 2200, impressions: 54000, conversions: 85, revenue: 6900, frequency: 1.8, ctr: 0.041, notes: ["High ROAS", "Scale opportunity"], },
// ];

// function scale(c: CampaignDTO, k: number, rename?: (n: string)=>string): CampaignDTO {
//   return {
//     ...c,
//     name: rename ? rename(c.name) : c.name,
//     spend: +(c.spend * k).toFixed(2),
//     clicks: Math.round(c.clicks * k),
//     impressions: Math.round(c.impressions * k),
//     conversions: Math.max(0, Math.round(c.conversions * k)),
//     revenue: +(c.revenue * (k * (k > 1 ? 0.95 : 1.05))).toFixed(2), // лёгкий шум
//     frequency: +(c.frequency * (k > 1 ? 1.05 : 0.95)).toFixed(1),
//     ctr: Math.min(0.15, Math.max(0.005, +(c.ctr * (k > 1 ? 0.95 : 1.05)).toFixed(3))),
//   };
// }

// const CLIENT_DATA: Record<ClientId, CampaignDTO[]> = {
//   acme: BASE,
//   orbit: BASE.map(c => scale(c, 0.7, n => `OR - ${n}`)),
//   nova: BASE.map(c => scale(c, 1.4, n => `NV - ${n}`)),
//   zen:  BASE.map(c => scale(c, 0.9, n => `ZN - ${n}`)),
// };

export type FetchFilters = {
    clientId?: ClientId;
    channel?: Channel;
    q?: string;
    dateFrom?: string; // YYYY-MM-DD
    dateTo?: string; // YYYY-MM-DD

    lowRoas?: number;
    highRoas?: number;
    minSpendForPause?: number;
    minConversionsForScale?: number;
    fatigueFreq?: number;
    lowCtr?: number;
};

export async function getCampaigns(filters: FetchFilters = {}) {
  const params = new URLSearchParams();
  if (filters.clientId) params.set("client", filters.clientId);
  if (filters.channel) params.set("channel", filters.channel);
  if (filters.q) params.set("q", filters.q);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);

  if (filters.lowRoas) params.set("lowRoas", String(filters.lowRoas));
  if (filters.highRoas) params.set("highRoas", String(filters.highRoas));
  if (filters.minSpendForPause) params.set("minSpendForPause", String(filters.minSpendForPause));
  if (filters.minConversionsForScale) params.set("minConvForScale", String(filters.minConversionsForScale));
  if (filters.fatigueFreq) params.set("fatigueFreq", String(filters.fatigueFreq));
  if (filters.lowCtr) params.set("lowCtr", String(filters.lowCtr));

  const url = `/api/campaigns${params.toString() ? `?${params.toString()}` : ""}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    let msg = "Failed to fetch campaigns";
    try {
      const data = await res.json();
      if (data?.detail) msg += `: ${data.detail}`;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

