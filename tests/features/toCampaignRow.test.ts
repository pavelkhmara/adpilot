import { describe, it, expect } from "vitest";
import type { CampaignListItem, KpiChip } from "../../src/lib/contracts/campaigns";
import { toCampaignRow } from "../../src/features/campaigns/adapters/toCampaignRow";

const chip = (o: Partial<KpiChip> = {}) => ({
  impressions: 1000, clicks: 100, spend: 200, conv: 10, revenue: 800, cpa: 20, roas: 4, ...o
});

describe("toCampaignRow adapter", () => {
  const base: CampaignListItem = {
    id: "cmp_1",
    name: "C1",
    channel: "meta",
    status: "active",
    today: chip(),
    d7: chip({ spend: 700 }),
    d30: chip({ spend: 3000 }),
    pacing: null,
    latestRecommendation: null,
    sparkSpend7: [1,2,3,4,5,6,7],
    sparkConv7: [0,1,0,1,0,1,0],
    sparkRoas7: [0.5,1,1.2,0.8,1,1.3,0.7]
  };

  it("uses d7 by default", () => {
    const row = toCampaignRow(base);
    expect(row.spend).toBe(700);
    expect(row.roas).toBeCloseTo(800/700, 3);
    expect(row.ctr).toBeCloseTo(100/1000, 3);
  });

  it("falls back to today then d30", () => {
    const row1 = toCampaignRow({ ...base, d7: undefined, today: chip({ spend: 100 }) });
    expect(row1.spend).toBe(100);

    const row2 = toCampaignRow({ ...base, d7: undefined, today: undefined, d30: chip({ spend: 999 }) });
    expect(row2.spend).toBe(999);
  });
});
