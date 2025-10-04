import { NextResponse } from 'next/server';
import { runOneSyncJob } from '../../../../server/connections/sync';

export async function POST() {
  const result = await runOneSyncJob();
  return NextResponse.json(result);
}