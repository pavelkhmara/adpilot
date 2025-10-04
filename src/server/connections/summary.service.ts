import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import type { ConnectionSummaryItem, ConnectionStatus, Provider, PROVIDER_DB } from '../../lib/types/connections';
import { aggregateStatus } from './status';
import { logger } from "../../server/debug/logger";
import { willExpireSoon } from './token';

// На стороне auth подставь свою реализацию получения clientId
async function getClientIdOrThrow(req: Request): Promise<string> {
  // Пример: достаём из заголовка (в бою — из сессии/токена)
  const clientId = req.headers.get('x-client-id') ?? '';
  if (!clientId) throw new Error('Missing clientId');
  return clientId;
}

const PROVIDERS_DB: PROVIDER_DB[] = ['META_ADS', 'GOOGLE_ADS', 'TT', 'LINKEDIN', 'OTHER'];
const providers: Provider[] = ['meta_ads', 'google_ads', 'tt', 'linkedin', 'other'];

type Health = { health: { expiresSoon: boolean; rateLimited: boolean } }
function makeEmpty() {
  return { statuses: [] as ConnectionStatus[], accountsCount: 0, lastSyncAt: null as Date | null, errors: 0, health: { expiresSoon: false, rateLimited: false } };
}

export async function getConnectionsSummary(req: Request): Promise<ConnectionSummaryItem[]> {
  const clientId = await getClientIdOrThrow(req);

  // Берём все Connection данного клиента
  const rows = await prisma.connection.findMany({
    where: { clientId },
    select: {
      provider: true,
      status: true,
      lastSyncAt: true,
      lastError: true,
      expiresAt: true, 
      rateLimitUntil: true,
      accounts: {
        select: { id: true },
      },
    },
  });

  // Группируем по провайдеру
  // const byProvider = new Map<Provider, {
  //   statuses: ConnectionStatus[];
  //   accountsCount: number;
  //   lastSyncAt: Date | null;
  //   errors: number;
  // }>();

  const byProvider = new Map<Provider, ReturnType<typeof makeEmpty>>();
  for (const p of providers) byProvider.set(p, makeEmpty());

  logger.warn("summary service", "byProvider rows", { byProvider, rows })
  for (const r of rows) {
    // Нормализуем значение провайдера, всё неизвестное — в 'other'
    const p = PROVIDERS_DB.includes(r.provider as PROVIDER_DB)
      ? (r.provider.toLocaleLowerCase() as Provider)
      : 'other';

    // Гарантируем бакет
    if (!byProvider.has(p)) byProvider.set(p, makeEmpty());

    const bucket = byProvider.get(p)!;
    bucket.statuses.push(r.status as ConnectionStatus);
    bucket.accountsCount += r.accounts.length;
    if (r.lastSyncAt && (!bucket.lastSyncAt || r.lastSyncAt > bucket.lastSyncAt)) {
      bucket.lastSyncAt = r.lastSyncAt;
    }
    if (r.status === 'error' || r.lastError) bucket.errors += 1;
    
    const expSoon = willExpireSoon(r.expiresAt as Date | null, 3*24*60*60*1000);
    if (expSoon) bucket.health.expiresSoon = true;
    if (r.rateLimitUntil && new Date(r.rateLimitUntil) > new Date()) bucket.health.rateLimited = true;
  }

  const items: ConnectionSummaryItem[] = [];
  for (const [provider, agg] of byProvider.entries()) {
    let status = aggregateStatus(agg.statuses);
    if (agg.health.expiresSoon && status!=='error') status = 'needs_reauth';

    items.push({
      provider,
      status,
      accountsCount: agg.accountsCount,
      lastSyncAt: agg.lastSyncAt ? agg.lastSyncAt.toISOString() : null,
      errorHint: agg.errors ? `Issues: ${agg.errors}` : undefined,
      health: agg.health,
    });
  }

  items.sort((a, b) => providers.indexOf(a.provider) - providers.indexOf(b.provider));
  return items;
}
