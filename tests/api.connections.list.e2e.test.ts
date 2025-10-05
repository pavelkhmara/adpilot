import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { ConnectionStatus, Provider } from '@prisma/client';
import { cleanupClientForTests, createClient, createConnectionForTests } from './e2e/testDb';
import * as ApplyRoute from "../src/app/api/connections/list/route";

describe('GET /api/connections/list', () => {
  let client: { id: string; key: string; name: string; };
  let conn: { id: string; status: ConnectionStatus; clientId: string; };

  beforeAll(async () => {
    client = await createClient();
    conn = await createConnectionForTests(client.id, 'OTHER' as Provider, {});
  });

  afterAll(async () => {
    await cleanupClientForTests(client.id);
    await cleanupClientForTests(conn.clientId);
  });

  it('returns connections with accounts array', async () => {
    const req = new Request("http://local/api/connections/list", {
        method: "GET",
        headers: { 'x-client-id': conn.clientId },
    });
    const res = await ApplyRoute.GET(req);
    const body = await res.json();
    expect(res.status).toBe(200);

    expect(Array.isArray(body.items)).toBe(true);
    if (body.items.length > 0) {
      expect(body.items[0]).toHaveProperty('accounts');
      expect(Array.isArray(body.items[0].accounts)).toBe(true);
    }
  });
});
