import type { CampaignRow, CampaignStatus, Channel } from "../../../lib/types";
import type { CampaignListItem, KpiChip } from "../../../lib/contracts/campaigns";

const pickRange = (c: CampaignListItem): KpiChip | undefined =>
  c.d7 ?? c.today ?? c.d30;

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
  };
}
