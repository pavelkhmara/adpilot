import { describe, it, expect } from "vitest";
import { KpiChip, CampaignListItem } from "../../src/lib/contracts/campaigns";

describe("Campaign contracts", () => {
  it("KpiChip parses with impressions/clicks", () => {
    const v = KpiChip.parse({
      impressions: 1000,
      clicks: 120,
      spend: 150.5,
      conv: 7,
      revenue: 980,
      cpa: 21.5,
      roas: 6.5
    });
    expect(v.impressions).toBe(1000);
    expect(v.clicks).toBe(120);
  });

  it("CampaignListItem minimal valid", () => {
    const chip = {
      impressions: 10, clicks: 2, spend: 5, conv: 1, revenue: 20, cpa: 5, roas: 4
    };
    const parsed = CampaignListItem.parse({
      id: "cmp_1",
      name: "Test",
      channel: "meta_ads",
      status: "active",
      today: chip,
      d7: chip,
      d30: chip,
      pacing: null,
      latestRecommendation: null,
      sparkSpend7: [0,1,2,3,4,5,6],
      sparkConv7: [0,0,1,0,1,0,0],
      sparkRoas7: [0,1,1.2,0.5,2,1.1,0.9]
    });
    expect(parsed.id).toBe("cmp_1");
  });
});
