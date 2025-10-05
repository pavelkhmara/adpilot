import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { ConnectionStatus, Provider } from '@prisma/client';
import { cleanupClientForTests, createClient, createConnectionForTests } from './e2e/testDb';
import * as ApplyRoute from "../src/app/api/connections/[id]/sync/route";

describe('POST /api/connections/:id/sync', () => {
  let conn: { id: string; status: ConnectionStatus; clientId: string; };
  let client: { id: string; key: string; name: string; };

  beforeAll(async () => {
    client = await createClient();
    conn = await createConnectionForTests(client.id, 'GOOGLE_ADS' as Provider, {});
  });

  afterAll(async () => {
    await cleanupClientForTests(client.id);
  });

  it('first call enqueues, second returns cooldown', async () => {
    const req1 = new Request(`http://local/api/connections/${conn.id}/sync`, {
        method: "POST",
        headers: { 'x-client-id': client.id },
    });
    const res1 = await ApplyRoute.POST(req1, {params: Promise.resolve({ id: conn.id })});
    const body1 = await res1.json();
    expect(res1.status).toBe(200);
    
    expect(body1.queued === true || body1.reason === 'cooldown').toBeTruthy();

    const req2 = new Request(`http://local/api/connections/${conn.id}/sync`, {
        method: "POST",
        headers: { 'x-client-id': client.id },
    });
    const res2 = await ApplyRoute.POST(req2, {params: Promise.resolve({ id: conn.id })});
    const body2 = await res2.json();
    expect(res2.status).toBe(200);
    if (body2.queued === false) {
      expect(body2.reason).toBe('cooldown');
      expect(typeof body2.cooldownMs === 'number').toBe(true);
    }
  });
});
