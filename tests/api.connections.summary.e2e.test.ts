import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { ConnectionStatus, Provider } from '@prisma/client';
import { cleanupClientForTests, createClient, createConnectionForTests } from './e2e/testDb';
import * as ApplyRoute from "../src/app/api/connections/summary/route";
import { ConnectionSummaryItem } from '@/lib/types/connections';

describe('GET /api/connections/summary', () => {
  let client: { id: string; key: string; name: string; };

  beforeAll(async () => {
    client = await createClient();
    await createConnectionForTests(client.id, 'GOOGLE_ADS' as Provider, { status: 'connected' as ConnectionStatus });
    await createConnectionForTests(client.id, 'META_ADS' as Provider, { status: 'needs_reauth' as ConnectionStatus, lastError: 'expired' });
  });

  afterAll(async () => {
    await cleanupClientForTests(client.id);
  });

  it('returns 5 providers and worst status aggregation', async () => {
    const req1 = new Request("http://local/api/connections/summary", {
      method: "GET",
      headers: { "Content-Type": "application/json", 'x-client-id': client.id },
    });
    const res1 = await ApplyRoute.GET(req1);
    const json1 = await res1.json();
    expect(res1.status).toBe(200);

    expect(Array.isArray(json1.items)).toBe(true);
    expect(json1.items).toHaveLength(5);

    const meta = json1.items.find((i: ConnectionSummaryItem) => i.provider === 'meta_ads');
    expect(meta).toBeTruthy();
    expect(meta.status === 'needs_reauth' || meta.status === 'error').toBeTruthy();
  });

  it('400 without clientId header', async () => {

    const req = new Request("http://local/api/connections/summary", {
      method: "GET",
    });
    const res = await ApplyRoute.GET(req);
    const body = await res.json();
    expect(res.status).toBe(400);

    expect(body.error || body.text).toBeDefined();
  });
});
