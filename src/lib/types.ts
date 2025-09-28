export type Channel = "Google Ads" | "Meta Ads";
export type Status = "Active" | "Learning" | "Paused";

export type Trend = "up" | "down" | "flat";

export type ClientId = string;


export type Recommendation = {
  type: RecType;
  title: string;
  reason: string;
  risk?: string;
  action?: RecAction;
};

export type RecType = "pause" | "scale" | "creative" | "none";
  
type RecAction =
  | { kind: "pause" }
  | { kind: "increase_budget"; by?: number }
  | { kind: "rotate_creatives" }
  | null;

export type CampaignRow = {
  id: string;
  name: string;
  channel: Channel;
  status: Status;

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
  recommendation?: Recommendation;
  notes?: string[];
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
