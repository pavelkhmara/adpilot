import { describe, it, expect } from "vitest";
import { filterInbox } from "../../src/features/recommendations/inboxFilter";
import { Rec } from "../../src/lib/contracts";

describe("filterInbox", () => {
  it("hides dismissed and snoozed in future", () => {
    const now = new Date();
    const future = new Date(now.getTime() + 24*3600*1000).toISOString();
    const items: Rec[] = [
        { id: "1", status: "proposed", validUntil: null,
            clientId: "string", channel: "string", level: "campaign", target: { campaignId: null, adSetId: null, adId: null, creativeId: null, externalId: null, }, type: "string", reason: "string", explanation: null, expectedEffect: { expectedKpi: "CPA", expectedDeltaAbs: null, expectedDeltaRel: null, horizon: "T7", }, confidence: 1, urgency: "high", priorityScore: 1, freshnessAt: null, actionPayload: "", createdBy: "rule", createdAt: "", updatedAt: "",
        },
        { id: "2", status: "dismissed", validUntil: null,
            clientId: "string", channel: "string", level: "campaign", target: { campaignId: null, adSetId: null, adId: null, creativeId: null, externalId: null, }, type: "string", reason: "string", explanation: null, expectedEffect: { expectedKpi: "CPA", expectedDeltaAbs: null, expectedDeltaRel: null, horizon: "T7", }, confidence: 1, urgency: "high", priorityScore: 1, freshnessAt: null, actionPayload: "", createdBy: "rule", createdAt: "", updatedAt: "",
        },
        { id: "3", status: "proposed", validUntil: future,
            clientId: "string", channel: "string", level: "campaign", target: { campaignId: null, adSetId: null, adId: null, creativeId: null, externalId: null, }, type: "string", reason: "string", explanation: null, expectedEffect: { expectedKpi: "CPA", expectedDeltaAbs: null, expectedDeltaRel: null, horizon: "T7", }, confidence: 1, urgency: "high", priorityScore: 1, freshnessAt: null, actionPayload: "", createdBy: "rule", createdAt: "", updatedAt: "",
        },
    ];
    const out = filterInbox(items);
    expect(out.map(x => x.id)).toEqual(["1"]);
  });
});
