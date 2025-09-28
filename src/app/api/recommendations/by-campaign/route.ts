import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

type RecOut = {
  campaignId: string;
  recommendation: {
    type: "pause" | "scale" | "creative" | "none";
    title: string;
    reason?: string;
  };
};

// ── helpers ───────────────────────────────────────────────────────────────────
function isJsonObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function normalizeType(actionType: string): RecOut["recommendation"]["type"] {
  const t = actionType.toLowerCase();
  if (t.includes("pause")) return "pause";
  if (t.includes("creative")) return "creative";
  if (t.includes("budget") || t.includes("bid") || t.includes("scale")) return "scale";
  return "none";
}

function makeTitle(actionType: string, payload: unknown): string {
  const t = actionType;
  if (isJsonObject(payload)) {
    // простые красивые названия для самых частых кейсов
    if (typeof payload.pct === "number" && /decrease.*budget/i.test(t)) {
      return `Decrease budget by ${payload.pct}%`;
    }
    if (typeof payload.pct === "number" && /increase.*budget/i.test(t)) {
      return `Increase budget by ${payload.pct}%`;
    }
    if (typeof payload.creativeId === "string" && /pause.*creative/i.test(t)) {
      return `Pause creative ${payload.creativeId}`;
    }
    if (typeof payload.adsetId === "string" && /reallocate/i.test(t)) {
      return `Reallocate spend (10%)`;
    }
  }
  // дефолт — сам actionType
  return t;
}

function makeReason(reason: unknown): string | undefined {
  if (reason == null) return undefined;
  if (typeof reason === "string") return reason;
  if (Array.isArray(reason)) {
    // массив строк/чисел → склеим
    return reason.map((x) => String(x)).join(", ");
  }
  if (isJsonObject(reason)) {
    // популярный формат: { rules: ["a","b"] } или { note: "..." }
    if (Array.isArray(reason.rules)) {
      return reason.rules.map((x) => String(x)).join(", ");
    }
    // иначе вытащим первые 2-3 ключа
    const entries = Object.entries(reason)
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
    return entries.join("; ");
  }
  // число/boolean
  return String(reason);
}

// ── handler ───────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get("ids") || "";
  const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  // Берём «кандидатов» и выберем по 1 лучшей на кампанию
  const rows = await prisma.recommendation.findMany({
    where: { campaignId: { in: ids }, status: { in: ["proposed"] } },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    // без include — тут не нужно
  });

  const bestByCampaign = new Map<string, typeof rows[number]>();
  for (const r of rows) {
    if (!bestByCampaign.has(r.campaignId)) bestByCampaign.set(r.campaignId, r);
  }

  const items: RecOut[] = [];
  for (const r of bestByCampaign.values()) {
    const type = normalizeType(r.actionType);
    const title = makeTitle(r.actionType, r.payload);
    const reasonStr = makeReason(r.reason); // безопасно для JsonValue
    items.push({
      campaignId: r.campaignId,
      recommendation: { type, title, reason: reasonStr },
    });
  }

  return NextResponse.json({ items });
}