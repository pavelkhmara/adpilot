import { describe, it, expect } from "vitest";
import { toUiRec } from "../../src/features/campaigns/mapRecToUi";
import { Rec } from "../../src/lib/contracts";

const dbRec = {
  id: "rec_1",
  type: "pause",
  status: "proposed",
  reason: "Low ROAS",
  validUntil: null
} as Rec;

describe("toUiRec", () => {
  it("maps DB Rec to UI Rec", () => {
    const ui = toUiRec(dbRec);
    expect(ui?.type).toBe("pause");
    expect(ui?.title?.toLowerCase()).toContain("pause");
    expect(ui?.reason).toBe("Low ROAS");
    expect(ui?.status).toBe("proposed");
  });
});
