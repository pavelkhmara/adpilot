import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/lib/db';
import type { ConnectionStatus, Provider } from '@prisma/client';
import { cleanupClientForTests, createClient, createConnectionForTests } from './e2e/testDb';
import * as ApplyRoute from "../src/app/api/connections/[id]/refresh/route";

describe('POST /api/connections/:id/refresh', () => {
    let conn: { id: string; status: ConnectionStatus; clientId: string; };
    let client: { id: string; key: string; name: string; };
  
    beforeAll(async () => {
      client = await createClient();
      conn = await createConnectionForTests(client.id, 'OTHER' as Provider, {
      tokenData: { refreshToken: 'rt' },
    });
  });

  afterAll(async () => {
    await cleanupClientForTests(client.id);
  });

  it('refreshes mock provider token or marks needs_reauth on error', async () => {
    const req1 = new Request(`http://local/api/connections/${conn.id}/refresh`, {
        method: "POST",
        headers: { 'x-client-id': client.id },
    });
    const res1 = await ApplyRoute.POST(req1, {params: Promise.resolve({ id: conn.id })});
    const body1 = await res1.json();
    expect(res1.status).toBe(200);

    expect(body1.refreshed === true || body1.reason).toBeDefined();

    const updated = await prisma.connection.findUnique({ where: { id: conn.id } });
    // либо успешно проставился tokenRefreshedAt, либо статус переведён в needs_reauth
    expect(!!updated?.tokenRefreshedAt || updated?.status === 'needs_reauth').toBe(true);
  });
});
