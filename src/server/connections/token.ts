import { prisma } from '../../lib/db';
import type { Connection, Prisma } from '@prisma/client';
import { getProviderAdapter, getProviderConfig } from '../../server/connections/providers/registry';

export function willExpireSoon(
  expiresAt: Date | null,
  windowMs = 3 * 24 * 60 * 60 * 1000
): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() - Date.now() <= windowMs;
}

// Узко приводим JsonValue к объекту { [k: string]: unknown }
function jsonAsObject(
  val: Prisma.JsonValue | null | undefined
): Record<string, unknown> {
  if (val && typeof val === "object" && !Array.isArray(val)) {
    return val as Record<string, unknown>;
  }
  return {};
}

function pickRefreshToken(conn: Connection): string | undefined {
  const obj = jsonAsObject(conn.tokenData as Prisma.JsonValue | null);
  const rt = obj["refreshToken"];
  return typeof rt === "string" ? rt : undefined;
}

function pickPrevRaw(conn: Connection): Prisma.InputJsonValue | null {
  const obj = jsonAsObject(conn.tokenData as Prisma.JsonValue | null);
  return (obj["raw"] as Prisma.InputJsonValue) ?? null;
}

// -- Public API --------------------------------------------------------------

export async function refreshIfNeeded(conn: Connection) {
  const adapter = getProviderAdapter(conn.provider);
  const cfg = getProviderConfig(conn.provider);

  if (!adapter.refreshToken) {
    return { refreshed: false, reason: "not_supported" } as const;
  }

  const rt = pickRefreshToken(conn);
  if (!rt) {
    return { refreshed: false, reason: "no_refresh_token" } as const;
  }

  // Запрашиваем новые токены у провайдера
  const next = await adapter.refreshToken(cfg, rt);

  // Собираем новое tokenData БЕЗ спреда по не-объектам
  const previous = jsonAsObject(conn.tokenData as Prisma.JsonValue | null);
  const prevRaw = pickPrevRaw(conn);

  const tokenData: Prisma.InputJsonValue = {
    ...previous,
    accessToken: next.accessToken,
    refreshToken: (next.refreshToken ?? rt) as Prisma.InputJsonValue,
    raw: (next.raw as Prisma.InputJsonValue) ?? prevRaw ?? null,
  };

  const expiresAt =
    next.expiresIn != null
      ? new Date(Date.now() + next.expiresIn * 1000)
      : conn.expiresAt ?? null;

  await prisma.connection.update({
    where: { id: conn.id },
    data: {
      tokenData,
      expiresAt,
      tokenRefreshedAt: new Date(),
      status: "connected",
      lastError: null,
    },
  });

  await prisma.connectionEvent.create({
    data: { connectionId: conn.id, type: "token_refresh", message: "ok" },
  });

  return { refreshed: true } as const;
}