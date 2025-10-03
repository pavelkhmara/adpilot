import type { CampaignLastRec, CampaignRow, CampaignStatus, Channel, UiRecommendation, UiRecType } from "../../../lib/types";
import type { CampaignListItem, KpiChip } from "../../../lib/contracts/campaigns";

const pickRange = (c: CampaignListItem): KpiChip | undefined =>
  c.d7 ?? c.today ?? c.d30;

const REC_LABEL: Record<string, string> = {
  pause: 'Pause',
  scale_up: 'Scale ↑',
  scale_down: 'Scale ↓',
  rotate_creative: 'Rotate',
  reallocate_budget: 'Reallocate',
};


function toRecBadge(rec: { id: string; type: string; priority: number | null} | null | undefined, status: string): CampaignLastRec | null {
  if (!rec) return null;
  const type = String(rec.type ?? 'rec');
  const label = REC_LABEL[type] ?? type.replace(/_/g, ' ');
  return {
    id: String(rec.id),
    type,
    status: (status ?? 'proposed') as 'proposed' | 'applied' | 'dismissed',
    priorityScore: rec.priority ?? null,
    label,
  };
}

export function toCampaignRow(c: CampaignListItem): CampaignRow {
  const k = pickRange(c);
  const impressions = k?.impressions ?? 0;
  const clicks = k?.clicks ?? 0;
  const spend = k?.spend ?? 0;
  const revenue = k?.revenue ?? 0;
  const conversions = k?.conv ?? 0;

  const ctr = impressions > 0 ? clicks / impressions : 0;
  const roas = spend > 0 ? revenue / spend : 0;
  const cpc = clicks > 0 ? spend / clicks : undefined;
  const frequency = impressions > 0 ? Math.max(1, impressions / Math.max(clicks, 1)) : 0;

  let latest
  if (c.latestRecommendation) { latest = toRecBadge(c.latestRecommendation, c.status);}

  const now = Date.now();
  const createdMs = 0;
  const ageMs = createdMs ? Math.max(0, now - createdMs) : Number.POSITIVE_INFINITY;
  const isNew = ageMs <= 5 * 60 * 1000;

  return {
    id: c.id,
    name: c.name,
    channel: c.channel as Channel,
    status: c.status as CampaignStatus,
    impressions,
    clicks,
    spend,
    conversions,
    revenue,
    ctr,
    cpc,
    roas,
    frequency,
    notes: undefined,
    recommendation: undefined,
    pacing: c.pacing ?? undefined,

    sparkSpend7: c.sparkSpend7,
    sparkConv7: c.sparkConv7,
    sparkRoas7: c.sparkRoas7,

    latestRec: latest ?? null,

    isNew,
    newAgeSec: isNew ? Math.floor(ageMs / 1000) : undefined,
  };
}
