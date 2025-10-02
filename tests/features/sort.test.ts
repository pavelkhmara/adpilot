import { describe, it, expect } from "vitest";
import { sortByKey } from "../../src/features/campaigns/sort";
import { CampaignRow } from "../../src/lib/types";
import { UiRec } from "../../src/features/campaigns/mapRecToUi";

type CampaignRowUI = Omit<CampaignRow, "recommendation"> & { recommendation?: UiRec };

const rows: CampaignRowUI[] = [
  { name: "B", spend: 100, revenue: 200, conversions: 10, ctr: 0.02, frequency: 1.1, id: "xcvsdf", channel: "Google Ads", status: "Learning", impressions: 12, clicks: 2432, recommendation: { title: "scale", type: "scale" }},
  { name: "A", spend: 50,  revenue: 25,  conversions: 0,  ctr: 0.01, frequency: 1.3, id: "sdfsdxcvsdf", channel: "Meta Ads", status: "Active", impressions: 1, clicks: 32432, recommendation: { title: "pause", type: "pause" } },
  { name: "C", spend: 0,   revenue: 0,   conversions: 0,  ctr: 0.00, frequency: 0.7, id: "x213sfddf", channel: "Channel", status: "Paused", impressions: 912, clicks: 72432, recommendation: undefined },
];

describe("sortByKey", () => {
  it("sorts by roas", () => {
    const out = sortByKey(rows, "roas", "desc");
    expect(out.map(r => r.name)).toEqual(["B", "A", "C"]); // 2.0, 0.5, 0
  });

  it("sorts by cpa with safe division", () => {
    const out = sortByKey(rows, "cpa", "asc");
    // A has conversions=0 => Infinity -> в конец
    expect(out.map(r => r.name)).toEqual(["B", "C", "A"]);
  });

  it("sorts by recommendation order (pause < scale < creative < none)", () => {
    const out = sortByKey(rows, "recommendation", "asc");
    expect(out.map(r => r.name)).toEqual(["A", "B", "C"]);
  });
});
