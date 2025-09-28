'use client';

import { useEffect, useState } from 'react';

type Provider = 'GOOGLE_ADS' | 'META_ADS';
type Item = { provider: Provider; status: 'connected'|'disconnected'; mode: 'demo'|'live'; externalAccountRef: string|null; };

export function ConnectionsPanel({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/connections?clientId=${encodeURIComponent(clientId)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load');
      setItems(data.items);
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err.message || 'Load error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (clientId) load(); }, [clientId]);

  async function connectDemo(slug: 'google' | 'meta') {
    setBusy(slug === 'google' ? 'GOOGLE_ADS' : 'META_ADS');
    setError(null);
    try {
      const res = await fetch(`/api/connections/${slug}/demo?clientId=${encodeURIComponent(clientId)}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to connect');
      await load();
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err?.message || 'Connect error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Connections</h3>
        {loading && <span className="text-sm opacity-70">Loading…</span>}
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((it) => {
          const isConnected = it.status === 'connected';
          const slug = it.provider === 'GOOGLE_ADS' ? 'google' : 'meta';
          return (
            <div key={it.provider} className="rounded-2xl border p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <div className="font-medium">
                  {it.provider === 'GOOGLE_ADS' ? 'Google Ads' : 'Meta Ads'}
                </div>
                <div className="text-sm opacity-70">
                  Status: {isConnected ? 'connected' : 'disconnected'} ({it.mode})
                </div>
                {it.externalAccountRef && (
                  <div className="text-xs opacity-60">Acct: {it.externalAccountRef}</div>
                )}
              </div>
              <div className="flex gap-2">
                {!isConnected ? (
                  <button
                    onClick={() => connectDemo(slug)}
                    disabled={!!busy}
                    className="px-3 py-1.5 rounded-lg bg-black text-white disabled:opacity-50"
                  >
                    {busy === it.provider ? 'Connecting…' : 'Connect (demo)'}
                  </button>
                ) : (
                  <span className="text-sm px-2 py-1 rounded bg-green-100 text-green-700">Connected</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
