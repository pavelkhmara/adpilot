import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';

export type LogItem = {
    createdAt: Date;
    id: string;
    type: string;
    message: string | null;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    const { searchParams } = await new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 200);
    const cursor = searchParams.get('cursor'); // createdAt ISO

    const where = { connectionId: id };

    const items = await prisma.connectionEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      // ...(cursor ? { cursor: { connectionId_createdAt: { connectionId: params.id, createdAt: new Date(cursor) } }, skip: 1 } : {}),
      ...(cursor ? { cursor: { id }, skip: 1 } : {}),
      take: limit,
      select: { id: true, type: true, message: true, createdAt: true },
    });

    const nextCursor = items.length === limit ? items[items.length - 1].createdAt.toISOString() : null;
    return NextResponse.json({ items, nextCursor });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}