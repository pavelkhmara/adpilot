import { NextResponse } from 'next/server';
import { enqueueSync } from '../../../../../server/connections/sync';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const res = await enqueueSync(id, 60_000); // 1 minute window
  return NextResponse.json(res);
}

