import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { refreshIfNeeded } from '../../../../../server/connections/token';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const conn = await prisma.connection.findUnique({ where: { id } });
  if (!conn) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    const res = await refreshIfNeeded(conn);
    return NextResponse.json(res, { status: 200 });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    await prisma.connection.update({ where: { id: conn.id }, data: { status: 'needs_reauth', lastError: err?.message ?? 'refresh_failed' } });
    await prisma.connectionEvent.create({ data: { connectionId: conn.id, type: 'error', message: `refresh_failed: ${err?.message ?? ''}` } });
    return NextResponse.json({ refreshed: false, reason: 'failed', error: err?.message }, { status: 500 });
  }
}