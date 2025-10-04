import { cookies } from "next/headers";
import { prisma } from "../../../../lib/db";
import { NextResponse } from "next/server";

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    let clientId = req.headers.get("x-client-id");
    if (!clientId) {
        clientId = (await cookies()).get("clientId")?.value ?? null;
        if (!clientId) return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
    }

    await prisma.connection.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error(String(e));
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 });
  }
}