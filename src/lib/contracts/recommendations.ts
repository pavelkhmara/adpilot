import { z } from "zod";

export const Rec = z.object({
  id: z.string(),
  clientId: z.string(),
  channel: z.string(),
  level: z.enum(["campaign","adset","ad","creative"]),
  target: z.object({
    campaignId: z.string().nullable(),
    adSetId: z.string().nullable(),
    adId: z.string().nullable(),
    creativeId: z.string().nullable(),
    externalId: z.string().nullable(),
  }),
  type: z.string(),
  status: z.enum(["proposed","applied","dismissed","expired","failed"]),
  reason: z.string(),
  explanation: z.string().nullable(),
  expectedEffect: z.object({
    kpi: z.enum(["CPA","ROAS","Spend","Conv"]),
    deltaAbs: z.number().nullable(),
    deltaRel: z.number().nullable(),
    horizon: z.enum(["T7","T14","T30"]),
  }),
  confidence: z.number(),           // 0..1
  urgency: z.enum(["low","med","high"]),
  priorityScore: z.number(),
  validUntil: z.string().nullable(),
  freshnessAt: z.string().nullable(),
  actionPayload: z.unknown(),
  createdBy: z.enum(["rule","ml","human"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Rec = z.infer<typeof Rec>;

export const RecListResponse = z.object({
  items: z.array(Rec),
  generatedAt: z.string(),
  timezoneUsed: z.string().default("Europe/Warsaw"),
});
export type RecListResponse = z.infer<typeof RecListResponse>;
