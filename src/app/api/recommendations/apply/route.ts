import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { randomBytes, createHash } from "crypto";
import { makeScopeKey, extractDelta } from "../../../../server/recommendations/guard";
import { logger } from "../../../../server/debug/logger";

type Body = {
  id: string;                // recommendationId
  by?: string;               // who applied: "user:<id>" | "auto"
  payload?: unknown;         // optional params about source
};

function makeIdemKey(input: { id: string; payload?: unknown }) {
  // don't double same recom hash
  const h = createHash("sha256")
    .update(input.id)
    .update(JSON.stringify(input.payload ?? {}))
    .digest("hex");
  return `apply:${h}`;
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  if (!body?.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const now = new Date();
  const idemKey = makeIdemKey({ id: body.id, payload: body.payload });

  const rec = await prisma.recommendation.findUnique({ where: { id: body.id } });
  if (!rec) {
    return NextResponse.json({ error: "Recommendation not found" }, { status: 404 });
  }
  if (rec.status === "applied") {
    // already applied — successfull
    return NextResponse.json({ ok: true, status: rec.status });
  }
  
  logger.info("recs.apply", "before guard { id, body, rec }", { id: body.id, body, rec });

  const scopeKey = makeScopeKey({ clientId: rec.clientId, campaignId: rec.campaignId ?? null, type: rec.type });
  const guard = await prisma.recommendationGuard.findUnique({ where: { scopeKey } }).catch(() => null);

  if (guard) {
    const now = new Date();
    // 1) cooldown
    if (guard.cooldownUntil && guard.cooldownUntil > now) {
      logger.warn("recs.apply", "guard_blocked", { reason: "cooldown", scopeKey: guard.scopeKey });
      return NextResponse.json({
        ok: false,
        error: "guard_blocked",
        reason: "cooldown",
        until: guard.cooldownUntil.toISOString(),
        scopeKey,
      }, { status: 409 });
    }

    // 2) запрет авто-режима
    const by = (body.by ?? "").toString();
    const isAuto = by.startsWith("auto");
    if (guard.isAutoAllowed === false && isAuto) {
      logger.warn("recs.apply", "guard_blocked", { reason: "auto_disallowed", scopeKey: guard.scopeKey });
      return NextResponse.json({
        ok: false,
        error: "guard_blocked",
        reason: "auto_disallowed",
        scopeKey,
      }, { status: 409 });
    }

    // 3) дневные лимиты на изменение бюджета
    const { pct, amountAbs } = extractDelta(body.payload);
    if (guard.dailyDeltaLimitRel != null && typeof pct === "number") {
      const limitPct = Number(guard.dailyDeltaLimitRel) * 100; // guard хранит 0..1
      if (pct > limitPct) {
        logger.warn("recs.apply", "limit_exceeded", { reason: "limit_exceeded", scopeKey: guard.scopeKey, limit: { type: "relative", maxPct: limitPct }, requested: { pct } });
        return NextResponse.json({
          ok: false,
          error: "limit_exceeded",
          limit: { type: "relative", maxPct: limitPct },
          requested: { pct },
          scopeKey,
        }, { status: 409 });
      }
    }
    if (guard.dailyDeltaLimitAbs != null && typeof amountAbs === "number" && amountAbs > Number(guard.dailyDeltaLimitAbs)) {
      logger.warn("recs.apply", "limit_exceeded", { reason: "limit_exceeded", scopeKey: guard.scopeKey, limit: { type: "absolute", max: Number(guard.dailyDeltaLimitAbs) }, requested: { amountAbs } });
      return NextResponse.json({
        ok: false,
        error: "limit_exceeded",
        limit: { type: "absolute", max: Number(guard.dailyDeltaLimitAbs) },
        requested: { amountAbs },
        scopeKey,
      }, { status: 409 });
    }
  }

  // EXAMPLE: here you would call an external source (Meta/Google) and get a response
  // For MVP — we emulate a successful response
  const sourceResponse = { ok: true, opId: randomBytes(8).toString("hex") };

  logger.info("recs.apply", "before transaction { recs, body }", { rec, body });
  try {
    const [action] = await prisma.$transaction([
      prisma.recommendationAction.create({
        data: {
          recommendationId: rec.id,
          appliedBy: body.by ?? "user:unknown",
          appliedAt: now,
          idempotencyKey: idemKey,       // must by UNIQUE
          requestPayload: body.payload ?? {},
          sourceResponse,
          result: "ok",
          errorMessage: null,
          rollbackHint: null,
        },
      }),
      prisma.recommendation.update({
        where: { id: rec.id },
        data: { status: "applied", updatedAt: now },
      }),
    ]);

    logger.info("recs.apply", "transaction Applied { id, action }", { id: rec.id, action });

    const AUTO_COOLDOWN_HOURS = Number(process.env.DEMO_APPLY_COOLDOWN_HOURS ?? "0"); // 0 = выключено
    if (guard && AUTO_COOLDOWN_HOURS > 0) {
      const until = new Date(Date.now() + AUTO_COOLDOWN_HOURS * 3600 * 1000);
      await prisma.recommendationGuard.update({
        where: { scopeKey },
        data: { cooldownUntil: until },
      }).catch(()=>{});
    }

    return NextResponse.json({
      ok: true,
      actionId: action.id,
      status: "applied",
      recommendationId: rec.id,
    });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    const msg = String(err?.message ?? err);
    if (msg.includes("Unique constraint failed") || msg.includes("prisma") && msg.includes("idempotencyKey")) {
      // already applied — successfull
      return NextResponse.json({ ok: true, status: "applied", duplicate: true });
    }
    return NextResponse.json({ ok: false, error: "apply_failed", message: msg }, { status: 500 });
  }
}
