import { createHash } from "crypto";
export function makeIdemKeyApply(id: string, payload?: unknown) {
  const h = createHash("sha256").update(id).update(JSON.stringify(payload ?? {})).digest("hex");
  return `apply:${h}`;
}

export const makeIdemKeyDismiss = (id: string, reason?: string) =>
  "dismiss:" + createHash("sha256").update(id).update(reason ?? "").digest("hex");

export const makeIdemKeySnooze = (id: string, untilISO: string, note?: string) =>
  "snooze:" + createHash("sha256").update(id).update(untilISO).update(note ?? "").digest("hex");