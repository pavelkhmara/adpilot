import { describe, it, expect } from "vitest";
import { makeIdemKeyDismiss, makeIdemKeySnooze } from "../../src/server/recommendations/idempotency";

describe("idempotency dismiss/snooze", () => {
  it("dismiss same reason -> same key", () => {
    const a = makeIdemKeyDismiss("rec1", "duplicate");
    const b = makeIdemKeyDismiss("rec1", "duplicate");
    expect(a).toBe(b);
  });
  it("snooze different dates -> different keys", () => {
    const a = makeIdemKeySnooze("rec1", "2025-10-10T00:00:00.000Z");
    const b = makeIdemKeySnooze("rec1", "2025-10-11T00:00:00.000Z");
    expect(a).not.toBe(b);
  });
});
