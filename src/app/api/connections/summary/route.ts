import { NextResponse } from 'next/server';
import { getConnectionsSummary } from '../../../../server/connections/summary.service';
import type { ConnectionSummaryResponse } from '../../../../lib/types/connections';

export const dynamic = 'force-dynamic'; // чтоб не кэшировалось во время разработки

export async function GET(req: Request) {
  try {
    const items = await getConnectionsSummary(req);
    const body: ConnectionSummaryResponse = { items };
    return NextResponse.json(body, { status: 200 });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    const message = err?.message ?? 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
