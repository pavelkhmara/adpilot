import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { RecListResponse } from "../../../lib/contracts/recommendations";
import { listRecommendations } from "../../../server/recommendations/service";
import { RecStatus } from "@prisma/client";
import { logger } from "../../../server/debug/logger";

type EffectWin = "T7" | "T14" | "T30";
type EffectKpi = "CPA" | "ROAS" | "Spend" | "Conv";

function isRec(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object";
}

function toNumberOrNull(x: unknown): number | null {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function normalizeExpectedEffect(
  raw: unknown,
  type: string | null | undefined,
  payload: unknown,
): {
  expectedKpi: EffectKpi;
  expectedDeltaAbs: number;
  expectedDeltaRel: number;
  horizon: EffectWin;
} {
  const ALLOWED: EffectKpi[] = ["CPA", "ROAS", "Spend", "Conv"];

  // 1) KPI
  let expectedKpi: EffectKpi | null = null;
  if (isRec(raw)) {
    const rk = raw["expectedKpi"] ?? raw["kpi"];
    if (typeof rk === "string" && (ALLOWED as string[]).includes(rk)) {
      expectedKpi = rk as EffectKpi;
    }
  }
  if (!expectedKpi) {
    const t = (type ?? "").toLowerCase();
    expectedKpi =
      t.startsWith("scale_") || t === "pause" || t.includes("budget")
        ? "Spend"
        : "ROAS";
  }

  // 2) ΔAbs / ΔRel
  let abs: number | null = null;
  let rel: number | null = null;

  if (isRec(raw)) {
    abs = toNumberOrNull(raw["expectedDeltaAbs"] ?? raw["deltaAbs"]);
    rel = toNumberOrNull(raw["expectedDeltaRel"] ?? raw["deltaRel"]);
  }
  if (abs == null && isRec(payload)) {
    abs = toNumberOrNull(payload["amountAbs"] ?? payload["amount"]);
  }
  if (rel == null && isRec(payload)) {
    rel = toNumberOrNull(payload["pct"]);
  }

  const expectedDeltaAbs = abs ?? 0;
  const expectedDeltaRel = rel ?? 0;

  // 3) Horizon
  let horizon: EffectWin = "T7";
  if (isRec(raw)) {
    const hz = raw["horizon"];
    if (hz === "T7" || hz === "T14" || hz === "T30") {
      horizon = hz;
    }
  }

  return { expectedKpi, expectedDeltaAbs, expectedDeltaRel, horizon };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cookieClientId = (await cookies()).get("clientId")?.value || null;
    const clientId = searchParams.get("clientId") ?? cookieClientId;
    const campaignId = searchParams.get("campaignId") || undefined;
    let status = searchParams.get("status") || undefined;

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    if (status === "all") {
      status = undefined;
    }

    logger.info("recs", "params to listRecommendations { clientId, campaignId, status }", { clientId, campaignId, status });
    const items = await listRecommendations({
      clientId,
      campaignId,
      status: status as RecStatus,
    });

    const uiItems = (items ?? []).map((it) => {
      const norm = normalizeExpectedEffect(it.expectedEffect, it.type, it.actionPayload);
      return {
        ...it,
        id: it.id,
        clientId: it.clientId,
        channel: it.channel,
        level: it.level,
        target: it.target ?? null,
        type: it.type,
        status: it.status,
        reason: it.reason,
        explanation: it.explanation ?? null,
        confidence: it.confidence,
        urgency: it.urgency,
        priorityScore: it.priorityScore,
        validUntil: it.validUntil ?? null,
        freshnessAt: it.freshnessAt ?? null,
        actionPayload: it.actionPayload ?? null,
        createdBy: it.createdBy,
        createdAt: it.createdAt,
        updatedAt: it.updatedAt,
        expectedEffect: norm,
      };
    });

    const bad = (items ?? []).find((x) => {
      const e = x?.expectedEffect;
      return !e || !("kpi" in e || "expectedKpi" in e);
    });
    if (bad) {
      logger.warn("recs", "expectedEffect missing/legacy shape; normalized", {
        id: bad.id,
        type: bad.type,
        example: bad.expectedEffect,
      });
    }


    logger.info("recs", "to UI go { Items , bad}", { items: items.length, item_sample: items[0], legacyCount: bad });
    const payload = RecListResponse.parse({
      items: uiItems,
      // items: [],
      generatedAt: new Date().toISOString(),
      timezoneUsed: "Europe/Warsaw",
    });

    return NextResponse.json(payload);
  } catch (err) {
    console.error("GET /api/recommendations error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
