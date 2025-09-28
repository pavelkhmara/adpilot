import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    // await prisma.$queryRaw`SELECT 1`;
    const { _count: campaigns } = await prisma.campaign.aggregate({ _count: true });
    const { _count: clients } = await prisma.client.aggregate({ _count: true });
    return Response.json({ ok: true, db: "up", campaigns, clients }, { status: 200 });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("GET /api/health error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message },
      { status: 500 }
    );
  }
}
