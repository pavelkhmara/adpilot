import { prisma } from '../../lib/db';

const PROVIDER_TTL_MS: Record<string, number> = {
  meta_ads: 60_000,
  google_ads: 60_000,
  tiktok: 60_000,
  linkedin: 60_000,
  other: 30_000,
};

export async function enqueueSync(connectionId: string) {
  const conn = await prisma.connection.findUnique({
    where: { id: connectionId },
    select: { id: true, provider: true, lastSyncAt: true },
  });
  if (!conn) return { queued: false, reason: 'not_found' } as const;

  const ttl = PROVIDER_TTL_MS[conn.provider] ?? 60_000;
  const now = Date.now();

  // недавний успешный синк
  if (conn.lastSyncAt && now - new Date(conn.lastSyncAt).getTime() < ttl) {
    const remaining = ttl - (now - new Date(conn.lastSyncAt).getTime());
    return { queued: false, reason: 'cooldown', cooldownMs: remaining } as const;
  }

  // do we already have a queued/running job recently?
  const existing = await prisma.jobQueue.findFirst({
    where: {
      connectionId,
      status: { in: ['queued', 'running'] },
      runAt: { gte: new Date(now - ttl) },
      type: 'connection_sync',
    },
  });
  if (existing) {
    const remaining = ttl - (now - new Date(existing.createdAt).getTime());
    return { queued: false, reason: 'cooldown', cooldownMs: Math.max(0, remaining) } as const;
  }

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