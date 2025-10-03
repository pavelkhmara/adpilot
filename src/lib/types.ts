import { UiRec } from "../features/campaigns/mapRecToUi";
import { Plan } from "./types";
export * from "../lib/contracts";

export type Channel = "Google Ads" | "Meta Ads" | string;
export type CampaignStatus = "Active" | "Learning" | "Paused" | string;

export type Trend = "up" | "down" | "flat";

export type ClientId = string;

export type UiRecStatus = "proposed" | "applied" | "dismissed" | "snoozed";
export type UiRecType = "pause" | "scale" | "creative" | "other";

export type UiRecommendation = {
  id: string;
  clientId: string;
  campaignId?: string | null;

  type: UiRecType;
  status: UiRecStatus;

  title: string;
  reason?: string;
  note?: string;

  validUntil?: string | null;
  createdAt: string; 
  updatedAt: string;

  window?: "T7" | "T14" | "T30"; 
  observedDeltaAbs?: number; 
  observedDeltaRel?: number
};

export type Recommendation = {
  id: string;
  clientId: string;
  channel: string;
  level: "creative" | "campaign" | "adset" | "ad";
  target: {
      campaignId: string | null;
      adSetId: string | null;
      adId: string | null;
      creativeId: string | null;
      externalId: string | null;
  };
  type: string;
  status: "proposed" | "applied" | "dismissed" | "expired" | "failed";
  reason: string;
  explanation: string | null;
  expectedEffect: {
      kpi: "CPA" | "ROAS" | "Spend" | "Conv";
      deltaAbs: number | null;
      deltaRel: number | null;
      horizon: "T7" | "T14" | "T30";
  };
  confidence: number;
  urgency: "low" | "med" | "high";
  priorityScore: number;
  validUntil: string | null;
  freshnessAt: string | null;
  actionPayload: unknown;
  createdBy: "rule" | "ml" | "human";
  createdAt: string;
  updatedAt: string;
};

// export type RecType = "pause" | "scale" | "creative" | "none";
  
// type RecAction =
//   | { kind: "pause" }
//   | { kind: "increase_budget"; by?: number }
//   | { kind: "rotate_creatives" }
//   | null;

export type CampaignLastRec = {
  id: string;
  type: string;  
  status: 'proposed' | 'applied' | 'dismissed';
  priorityScore?: number | null;
  createdAt?: string; 
  label?: string;
}

export type CampaignRow = {
  id: string;
  name: string;
  channel: Channel;
  status: CampaignStatus;

  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  revenue: number;

  ctr: number;
  cpc?: number;
  roas?: number;
  frequency: number;

  // roasPrev?: number;
  // cpaPrev?: number;
  // ctrPrev?: number;
  roasTrend?: Trend;
  cpaTrend?: Trend;
  ctrTrend?: Trend;
  recommendation?: Recommendation | UiRec;
  notes?: string[];
  pacing?: { expectedToDate: number; actualToDate: number; delta: number; plan?: Plan | null };
  sparkSpend7?: number[];
  sparkConv7?: number[];
  sparkRoas7?: number[];

  latestRec?: CampaignLastRec | null;

  isNew?: boolean;
  newAgeSec?: number;
};

export type FetchFilters = {
  client?: string;
  channel?: Channel;
  q?: string;
  dateFrom?: string;
  dateTo?: string;

  lowRoas?: number;
  highRoas?: number;
  minSpendForPause?: number;
  minConversionsForScale?: number;
  fatigueFreq?: number;
  lowCtr?: number;
};
