import { prisma } from '../../lib/db';

export async function enqueueSync(connectionId: string, windowMs = 60_000) {
  // do we already have a queued/running job recently?
  const existing = await prisma.jobQueue.findFirst({
    where: {
      connectionId,
      status: { in: ['queued', 'running'] },
      runAt: { gte: new Date(Date.now() - windowMs) },
      type: 'connection_sync',
    },
  });
  if (existing) return { queued: false, reason: 'already_pending' } as const;

  await prisma.jobQueue.create({ data: { connectionId, type: 'connection_sync', status: 'queued' } });
  await prisma.connectionEvent.create({ data: { connectionId, type: 'sync_start', message: 'Enqueued' } });
  return { queued: true } as const;
}

export async function runOneSyncJob() {
  // pick next due job
  const job = await prisma.jobQueue.findFirst({
    where: { status: 'queued', runAt: { lte: new Date() } },
    orderBy: { createdAt: 'asc' },
  });
  if (!job) return { processed: false } as const;

  // mark running
  const started = await prisma.jobQueue.update({ where: { id: job.id }, data: { status: 'running', attempts: { increment: 1 } } });

  try {
    // TODO: perform actual sync using provider APIs
    // simulate work
    await new Promise((r) => setTimeout(r, 300));

    await prisma.jobQueue.update({ where: { id: started.id }, data: { status: 'done' } });
    await prisma.connection.update({ where: { id: job.connectionId }, data: { lastSyncAt: new Date(), lastError: null } });
    await prisma.connectionEvent.create({ data: { connectionId: job.connectionId, type: 'sync_ok', message: 'OK' } });
    return { processed: true } as const;
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    await prisma.jobQueue.update({ where: { id: started.id }, data: { status: 'failed', lastError: err?.message || 'error' } });
    await prisma.connection.update({ where: { id: job.connectionId }, data: { lastError: err?.message || 'error', status: 'error' } });
    await prisma.connectionEvent.create({ data: { connectionId: job.connectionId, type: 'sync_error', message: err?.message || 'error' } });
    return { processed: true } as const;
  }
}