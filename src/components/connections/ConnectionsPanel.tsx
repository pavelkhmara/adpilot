'use client';
import { useEffect, useState } from 'react';
import { OAuthStubModal } from './OAuthStubModal';

type Provider = 'GOOGLE_ADS' | 'META_ADS';
type Item = { provider: Provider; status: 'connected'|'disconnected'; mode: 'demo'|'live'; externalAccountRef: string|null; };

export function ConnectionsPanel({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalProvider, setModalProvider] = useState<'google' | 'meta' | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/connections?clientId=${encodeURIComponent(clientId)}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load');
      setItems(data.items);
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error(String(e));
      setError(error?.message || 'Load error');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { if (clientId) load(); }, [clientId]);

  function openModal(p: 'google' | 'meta') {
    setModalProvider(p);
    setModalOpen(true);
  }

  async function confirmConnect(p: 'google' | 'meta') {
    setError(null);
    const res = await fetch(`/api/connections/${p}/demo?clientId=${encodeURIComponent(clientId)}`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to connect');
    await load();
  }

  async function disconnect(slug: 'google' | 'meta') {
    setError(null);
    const res = await fetch(`/api/connections/${slug}/disconnect?clientId=${encodeURIComponent(clientId)}`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Failed to disconnect');
    await load();
  }

  async function callAndPing(url: string) {
    const res = await fetch(url, { method: "POST" });
    try {
      const json = await res.json();
      if (json?.recsEmitted > 0) {
        window.dispatchEvent(new Event("recs:changed"));
      }
    } catch {}
  }

  const [chaos, setChaos] = useState(false);
  const [seed, setSeed] = useState<string>("");

  function buildUrl(base: string) {
    const u = new URL(base, window.location.origin);
    if (chaos) u.searchParams.set("mode", "chaos");
    if (seed) u.searchParams.set("seed", seed);
    return u.pathname + u.search;
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
              
              <div className='flex flex-col'>
                
              <div className="flex justify-end gap-2">
                {!isConnected ? (
                    <button
                    onClick={() => openModal(slug)}
                    className="px-3 py-1.5 rounded-lg bg-black text-white"
                    >
                    Connect →
                    </button>
                ) : (
                    <>
                    <span className="text-sm px-2 py-1 rounded bg-green-100 text-green-700">Connected</span>
                    <button
                        onClick={() => disconnect(slug)}
                        className="px-3 py-1.5 rounded-lg border"
                    >
                        Disconnect
                    </button>
                    </>
                )}
                </div>

                <div className='flex gap-2'>
                  <input
                    className="pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 w-64"
                    value={seed}
                    onChange={e => setSeed(e.target.value)}
                    placeholder="seed"
                  />
                  <button onClick={() => callAndPing(buildUrl(`/api/simulate/seed?clientId=${encodeURIComponent(clientId)}`))} className="px-3 py-1.5 rounded-lg border">Seed demo data</button>

                  <button onClick={() => callAndPing(buildUrl(`/api/simulate/tick?clientId=${encodeURIComponent(clientId)}`))} className="px-3 py-1.5 rounded-lg border">Tick ×1</button>

                  <label className="text-sm flex items-center gap-2">
                    <input type="checkbox" checked={chaos} onChange={e => setChaos(e.target.checked)} />
                    Chaos mode
                  </label>

                  <label className="text-sm flex items-center gap-2">
                    <input type="checkbox" onChange={(e) => {
                      if (e.target.checked) {
                        const id = setInterval(() => callAndPing(`/api/simulate/tick?clientId=${encodeURIComponent(clientId)}`), 20000);
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (window as any).__simTickId = id;
                      } else {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        clearInterval((window as any).__simTickId);
                      }
                    }} />
                    Auto-tick
                  </label>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      <OAuthStubModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        provider={modalProvider}
        onConfirm={confirmConnect}
      />
    </div>
  );
}
