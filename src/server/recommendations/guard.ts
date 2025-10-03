import type { Recommendation, Prisma } from "@prisma/client";

export function makeScopeKey(rec: Pick<Recommendation, "clientId"|"campaignId"|"type">) {
  const t = (rec.type || "").toLowerCase();
  const isBudget = t.includes("scale") || t.includes("budget") || t.includes("shift");
  if (isBudget && rec.campaignId) return `campaign:${rec.campaignId}:budget`;
  return `client:${rec.clientId}:global`;
}

type Delta = { pct: number | null; amountAbs: number | null };

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object";
}

/** Достаём величину изменения бюджета из payload.
 *  Поддерживает:
 *   - { pct: number }     → относительная дельта (в процентах)
 *   - { amountAbs: number } или { amount: number } → абсолютная дельта
 *   - число → трактуем как абсолютную дельту
 */
export function extractDelta(input: unknown): Delta {
  let pct: number | null = null;
  let amountAbs: number | null = null;

  if (typeof input === "number") {
    amountAbs = Math.abs(input);
    return { pct, amountAbs };
  }

  if (isRecord(input)) {
    const p = input["pct"];
    if (typeof p === "number") pct = Math.abs(p);

    const a = input["amountAbs"] ?? input["amount"];
    if (typeof a === "number") amountAbs = Math.abs(a);
  }

  return { pct, amountAbs };
}
