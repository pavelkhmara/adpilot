import { describe, it, expect } from "vitest";
import { makeIdemKeyApply } from "../../src/server/recommendations/idempotency";

describe("idempotency key", () => {
  it("same inputs -> same key", () => {
    const a = makeIdemKeyApply("rec_1", { a: 1 });
    const b = makeIdemKeyApply("rec_1", { a: 1 });
    expect(a).toBe(b);
  });
  it("different payload -> different key", () => {
    const a = makeIdemKeyApply("rec_1", { a: 1 });
    const b = makeIdemKeyApply("rec_1", { a: 2 });
    expect(a).not.toBe(b);
  });
});
