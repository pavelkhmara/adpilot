import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/db';
import { getProviderAdapter, getProviderConfig } from '../../../../../server/connections/providers/registry';
import type { ConnectionStatus, Provider } from '../../../../../lib/types/connections';
import { $Enums, Prisma } from '@prisma/client';
import { logger } from "../../../../../server/debug/logger";

function redirectAbs(req: Request, path: string) {
  // берём origin из env (если есть) или из текущего запроса
  const base = process.env.NEXT_PUBLIC_APP_URL || req.url;
  return NextResponse.redirect(new URL(path, base));
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  // 1) Безопасно читаем параметры
  const providerParam = url.searchParams.get("provider") ?? "other";
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";

  if (!code) {
    return redirectAbs(req, "/settings/connections?oauth=missing_code");
  }

  // 2) Приводим provider к Prisma enum (из schema.prisma: enum Provider { ... })
  const PROVIDERS: Provider[] = ['meta_ads', 'google_ads', 'tt', 'linkedin', 'other'];
  const provider = PROVIDERS.includes(providerParam as Provider) ? (providerParam.toUpperCase() as Prisma.EnumProviderFilter) : "OTHER";

  logger.warn("oath callback", "provider", { provider, params: url.searchParams, inPro:  PROVIDERS.includes(providerParam as Provider) })


  // state ожидаем вида: provider:clientId:timestamp
  const clientIdFromState = state.split(":")[1] ?? "";

  const adapter = getProviderAdapter(providerParam);
  const cfg = getProviderConfig(providerParam);

  // Exchange code for tokens
  try {
    const tokens = await adapter.exchangeCode(cfg, code);

    // tokenData должен быть JSON-совместимым значением
    const tokenData: Prisma.InputJsonValue = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? null,
      // raw может быть unknown — приведём к any/null, чтобы удовлетворить типу Json
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      raw: (tokens.raw ?? null) as any,
    };



    // Upsert connection for this client+provider
    const connection = await prisma.connection.upsert({
      where: {
        // composite via unique? If not, use findFirst+create; for demo assume (clientId, provider) not unique
        id: (await prisma.connection.findFirst({ where: { clientId: clientIdFromState, provider: provider }, select: { id: true } }))?.id || '___will_create___',
      },
      update: {
        status: 'connected' as ConnectionStatus,
        scopes: cfg.scopes,
        tokenData: tokenData,
        expiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : null,
        lastError: null,
      },
      create: {
        clientId: clientIdFromState,
        provider: provider as $Enums.Provider,
        status: 'connected' as ConnectionStatus,
        scopes: cfg.scopes,
        tokenData: tokenData,
        expiresAt: tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : null,
      },
    });

    await prisma.connectionEvent.create({
      data: { connectionId: connection.id, type: 'connect', message: `OAuth connected: ${provider}` },
    });

    return redirectAbs(req, "/settings/connections?oauth=ok");
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    const errMsg = err.message || 'OAuth error';
    // best effort: log against any existing connection for this state
    const existing = await prisma.connection.findFirst({ where: { clientId: clientIdFromState, provider: provider }, select: { id: true } });
    if (existing) {
      await prisma.connection.update({ where: { id: existing.id }, data: { status: 'error', lastError: errMsg } });
      await prisma.connectionEvent.create({ data: { connectionId: existing.id, type: 'error', message: errMsg } });
    }
    return redirectAbs(req, `/settings/connections?oauth=error&reason=${encodeURIComponent(errMsg)}`);
  }
}