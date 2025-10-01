import type { Rec } from "@/lib/contracts/recommendations";

export type UiRecType = "pause" | "scale" | "creative" | "none";
export type UiRec = { type: UiRecType; title: string; reason?: string; status?: string; validUntil?: string };

const TITLE_BY_TYPE: Record<string, string> = {
  pause: "Pause campaign",
  scale: "Increase budget",
  creative: "Rotate creatives",
};

export function toUiRec(rec: Rec | undefined | null): UiRec | undefined {
  if (!rec) return undefined;
  const type = (rec.type as UiRecType) ?? "none";
  const title = TITLE_BY_TYPE[rec.type] ?? rec.type;
  return { type, title, reason: rec.reason ?? undefined, status: rec.status ?? undefined, validUntil: rec.validUntil ?? undefined };
}
