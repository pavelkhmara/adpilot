import { z } from "zod";

export const KpiChip = z.object({
  impressions: z.number().default(0),
  clicks: z.number().default(0),
  spend: z.number(),
  conv: z.number(),
  revenue: z.number(),
  cpa: z.number().nullable(),
  roas: z.number().nullable(),
});
export type KpiChip = z.infer<typeof KpiChip>;

export const Pacing = z.object({
  expectedToDate: z.number(),
  actualToDate: z.number(),
  delta: z.number(), 
  planMonth: z.string().optional().nullable(),
});
export type Pacing = z.infer<typeof Pacing>;

export const CampaignListItem = z.object({
  id: z.string(), name: z.string(),
  channel: z.string(), status: z.string(),
  badges: z.object({
    learning: z.boolean().optional(),
    limitedByBudget: z.boolean().optional(),
    limitedByBid: z.boolean().optional(),
    policyIssues: z.array(z.string()).optional(),
  }).optional(),
  budget: z.object({
    type: z.enum(["daily","lifetime"]).nullable(),
    amount: z.number().nullable(),
    currency: z.string(),
  }).nullable().optional(),
  today: KpiChip.optional(),
  d7: KpiChip.optional(),
  d30: KpiChip.optional(),
  pacing: Pacing.nullable().optional(),
  lastChangeAt: z.string().nullable().optional(),
  lastSyncAt: z.string().nullable().optional(),
  latestRecommendation: z.object({
    id: z.string(), type: z.string(), priority: z.number(),
  }).nullable().optional(),
  
  // Simplified sparklines
  sparkSpend7: z.array(z.number()).optional(),
  sparkConv7: z.array(z.number()).optional(),
  sparkRoas7: z.array(z.number()).optional(),
});
export type CampaignListItem = z.infer<typeof CampaignListItem>;

export const CampaignListResponse = z.object({
  items: z.array(CampaignListItem),
  generatedAt: z.string(),
  timezoneUsed: z.string().default("Europe/Warsaw"),
  dataVersion: z.string().optional(),
  metricsSource: z.enum(["platform","blended","auto"]).default("platform"),
});
export type CampaignListResponse = z.infer<typeof CampaignListResponse>;

export const ListQuery = z.object({
  clientId: z.string(),
  status: z.array(z.string()).optional(),
  channel: z.array(z.string()).optional(),
  objective: z.array(z.string()).optional(),
  search: z.string().optional(),
  hasAlerts: z.boolean().optional(),
  learningOnly: z.boolean().optional(),
  dateRange: z.string().optional(),     // e.g. "last_7d"
  sortBy: z.string().optional(),
  order: z.enum(["asc","desc"]).optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
  metricsSource: z.enum(["platform","blended","auto"]).optional(),
});
export type ListQuery = z.infer<typeof ListQuery>;


