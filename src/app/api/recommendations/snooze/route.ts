import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createHash } from "crypto";

type Body = {
  id: string;               // recommendationId
  by?: string;              // "user:<id>" | "auto"
  until: string;            // ISO-строка, например "2025-10-15T00:00:00.000Z"
  note?: string;            // опц. комментарий
};

function makeIdemKey(id: string, until: string, note?: string) {
  const h = createHash("sha256").update(id).update(until).update(note ?? "").digest("hex");
  return `snooze:${h}`;
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  if (!body?.id || !body?.until) {
    return NextResponse.json({ error: "id and until are required" }, { status: 400 });
  }

  const until = new Date(body.until);
  if (isNaN(until.getTime())) {
    return NextResponse.json({ error: "invalid 'until' date" }, { status: 400 });
  }

  const rec = await prisma.recommendation.findUnique({ where: { id: body.id } });
  if (!rec) {
    return NextResponse.json({ error: "Recommendation not found" }, { status: 404 });
  }

  // Логика Snooze: статус остаётся "proposed", просто прячем до validUntil
  const now = new Date();
  const idemKey = makeIdemKey(body.id, until.toISOString(), body.note);

  try {
    await prisma.$transaction([
      prisma.recommendationAction.create({
        data: {
          recommendationId: rec.id,
          appliedBy: body.by ?? "user:unknown",
          appliedAt: now,
          idempotencyKey: idemKey,          // UNIQUE в схеме
          requestPayload: { until: until.toISOString(), note: body.note ?? null },
          sourceResponse: undefined,
          result: "ok",
          errorMessage: null,
          rollbackHint: null,
        },
      }),
      prisma.recommendation.update({
        where: { id: rec.id },
        data: {
          validUntil: until,                // <— ключевой момент
          // статус НЕ меняем: остаётся "proposed"
          updatedAt: now,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      status: "proposed",
      validUntil: until.toISOString(),
      recommendationId: rec.id,
    });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    const msg = String(err?.message ?? err);
    if (msg.includes("Unique constraint failed") || msg.includes("idempotencyKey")) {
      return NextResponse.json({ ok: true, status: "proposed", duplicate: true });
    }
    return NextResponse.json({ ok: false, error: "snooze_failed", message: msg }, { status: 500 });
  }
}
