import { NextResponse } from 'next/server';
import { getProviderAdapter, getProviderConfig } from '../../../../../../server/connections/providers/registry';
import { cookies } from 'next/headers';
import { logger } from "../../../../../../server/debug/logger";

export async function POST(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  let clientId = req.headers.get("x-client-id");
  if (!clientId) {
      clientId = (await cookies()).get("clientId")?.value ?? null;
      if (!clientId) return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
  }

  const adapter = getProviderAdapter(provider);
  const cfg = getProviderConfig(provider);
  
  const state = `${provider}:${clientId}:${Date.now()}`; // you may HMAC it
  const url = adapter.buildAuthUrl(cfg, { provider, state });
  
  logger.debug("connect provider", `--------- url --------- `, { url })
  return NextResponse.json({ url }, { status: 200 });
}
