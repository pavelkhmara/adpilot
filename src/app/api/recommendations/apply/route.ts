import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomBytes, createHash } from "crypto";

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

  // EXAMPLE: here you would call an external source (Meta/Google) and get a response
  // For MVP — we emulate a successful response
  const sourceResponse = { ok: true, opId: randomBytes(8).toString("hex") };

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
