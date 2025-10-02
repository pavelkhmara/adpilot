import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";
import { createHash } from "crypto";

type Body = {
  id: string;              // recommendationId
  by?: string;             // "user:<id>" | "auto"
  reason?: string;      
};

function makeIdemKey(id: string, reason?: string) {
  const h = createHash("sha256").update(id).update(reason ?? "").digest("hex");
  return `dismiss:${h}`;
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body;
  if (!body?.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const rec = await prisma.recommendation.findUnique({ where: { id: body.id } });
  if (!rec) {
    return NextResponse.json({ error: "Recommendation not found" }, { status: 404 });
  }

  const now = new Date();
  const idemKey = makeIdemKey(body.id, body.reason);

  try {
    await prisma.$transaction([
      prisma.recommendationAction.create({
        data: {
          recommendationId: rec.id,
          appliedBy: body.by ?? "user:unknown",
          appliedAt: now,
          idempotencyKey: idemKey,    // UNIQUE 
          requestPayload: { reason: body.reason ?? null },
          sourceResponse: undefined,
          result: "ok",
          errorMessage: null,
          rollbackHint: null,
        },
      }),
      prisma.recommendation.update({
        where: { id: rec.id },
        data: { status: "dismissed", updatedAt: now },
      }),
    ]);

    return NextResponse.json({ ok: true, status: "dismissed", recommendationId: rec.id });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    const msg = String(err?.message ?? err);
    if (msg.includes("Unique constraint failed") || msg.includes("idempotencyKey")) {
      return NextResponse.json({ ok: true, status: "dismissed", duplicate: true });
    }
    return NextResponse.json({ ok: false, error: "dismiss_failed", message: msg }, { status: 500 });
  }
}
