import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { Rec } from "@/lib/contracts/recommendations";

// export type UiRec = {
//   campaignId: string;
//   createdAt: string;
//   id?: string;
//   priority: number;
//   reason?: string;
//   title: string;
//   type: "pause" | "scale" | "creative" | "none";
// };

// ── helpers ───────────────────────────────────────────────────────────────────
// const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

// const normType = (actionType: string): Rec["type"] => {
//   const t = actionType.toLowerCase();
//   if (t.includes("pause")) return "pause";
//   if (t.includes("creative")) return "creative";
//   if (t.includes("budget") || t.includes("bid") || t.includes("scale")) return "scale";
//   return "none";
// };

// function makeTitle(actionType: string, payload: unknown): string {
//   const t = actionType;
//   if (isObj(payload)) {
//     // nice titles for frequently used cases
//     if (typeof payload.pct === "number" && /decrease.*budget/i.test(t)) {
//       return `Decrease budget by ${payload.pct}%`;
//     }
//     if (typeof payload.pct === "number" && /increase.*budget/i.test(t)) {
//       return `Increase budget by ${payload.pct}%`;
//     }
//     if (typeof payload.creativeId === "string" && /pause.*creative/i.test(t)) {
//       return `Pause creative ${payload.creativeId}`;
//     }
//     if (typeof payload.adsetId === "string" && /reallocate/i.test(t)) {
//       return `Reallocate spend (10%)`;
//     }
//   }
//   // default — this actionType
//   return t;
// }

// const makeReason = (reason: unknown): string | undefined => {
//   if (!reason) return undefined;
//   if (typeof reason === "string") return reason;
//   if (Array.isArray(reason)) return reason.map(String).join(", ");
//   if (isObj(reason) && Array.isArray(reason.rules)) return reason.rules.map(String).join(", ");
//   return typeof reason === "object" ? JSON.stringify(reason) : String(reason);
// };

// ── handler ───────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get("ids") || "";
  const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json({ items: [] }, { status: 200 });
  }

// const owned = await prisma.campaign.findMany({
//     where: { id: { in: ids }, clientId: currentClientIdFromSession },
//     select: { id: true },
// });
// const ownedIds = new Set(owned.map(x => x.id));
// const filtered = ids.filter(id => ownedIds.has(id));
// if (!filtered.length) return NextResponse.json({ items: [] });

  // Take the candidates and select the best one per campaign
  const rows = await prisma.recommendation.findMany({
    where: { campaignId: { in: ids }, status: { in: ["proposed"] } },
    orderBy: [{ priorityScore: "desc" }, { createdAt: "desc" }],
    // without include — don't need
  });

  const bestByCampaign = new Map<string, typeof rows[number]>();
  for (const r of rows) {
    if (r.campaignId) {
      if (!bestByCampaign.has(r.campaignId)) bestByCampaign.set(r.campaignId, r);
    }
  }

  const items: Partial<Rec>[] = [...bestByCampaign.values()].map(r => ({
    id: r.id,
    campaignId: r.campaignId,
    type: r.type,
    reason: r.reason,
    explanation: r.explanation,
    priority: r.priorityScore,
    createdAt: r.createdAt.toISOString(),
  }));

  return NextResponse.json({ items });
}