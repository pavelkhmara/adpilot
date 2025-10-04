"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../../../components/UI/card";
import { Button } from "../../../components/UI/button";
import { Badge } from "../../../components/UI/Badge";
import { Input } from "../../../components/UI/input";
import { Separator } from "../../../components/UI/separator";
import type { ConnectionHealth, ConnectionStatus, Provider } from "../../../lib/types/connections";
import { usePolling } from '../../../lib/hooks/usePolling';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/UI/dialog';
import { LogItem } from "../../../app/api/connections/[id]/logs/route";
import { ToastsProvider, useToasts } from "../../../components/dashboard/Toasts";


export default function ConnectionsSettingsPage() {
  const sp = useSearchParams();
  const clientId = useMemo(() => sp.get('clientId'), []);
  return (
    <ToastsProvider>
        <ConnectionsSettingsInner client={clientId} />
    </ToastsProvider>
  );
}

// Types specific for this page
export type ConnectionListItem = {
  id: string;
  provider: Provider;
  status: ConnectionStatus;
  scopes: string[];
  expiresAt: string | null;
  lastSyncAt: string | null;
  lastError?: string | null;
  accounts: Array<{
    id: string;
    externalAccountId: string;
    name: string;
    currency: string;
    timezone: string;
    lastImportedAt: string | null;
    isActive: boolean;
  }>;
  health?: ConnectionHealth;
};

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 0) return "in the future";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const PROVIDER_LABEL: Record<Provider, string> = {
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
  tt: "TikTok Ads",
  linkedin: "LinkedIn Ads",
  other: "Other",
};

const PROVIDER_ICON: Record<string, React.ReactNode> = {
  meta_ads: <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />,
  google_ads: <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-500" />,
  tt: <span className="inline-block w-2.5 h-2.5 rounded-full bg-pink-500" />,
  linkedin: <span className="inline-block w-2.5 h-2.5 rounded-full bg-sky-600" />,
  other: <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-400" />,
};

const statusToBadge: Record<ConnectionStatus, { variant: "default" | "secondary" | "destructive" | "outline"; label: string } > = {
  disconnected: { variant: "destructive", label: "Disconnected" },
  connected: { variant: "default", label: "Connected" },
  syncing: { variant: "secondary", label: "Syncing" },
  needs_reauth: { variant: "destructive", label: "Re-auth" },
  error: { variant: "destructive", label: "Error" },
  not_connected: { variant: "outline", label: "Not connected" },
};

function ConnectionsSettingsInner({ client }: { client: string | null }) {
  const router = useRouter();
  const { pushToast } = useToasts();

  const sp = useSearchParams();
  useEffect(() => {
    const oauth = sp.get('oauth');
    if (oauth === 'ok') pushToast('Connected');
    if (oauth === 'error') pushToast('OAuth error');
  }, [sp]);

  const clientId = useMemo(() => client, []);

  const [rows, setRows] = useState<ConnectionListItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [logOpenFor, setLogOpenFor] = useState<string | null>(null);
  const [logs, setLogs] = useState<{ id: string; type: string; message: string | null; createdAt: string; }[]>([]);
  const [logsCursor, setLogsCursor] = useState<string | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);

  async function refetch() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/connections/list", { headers: { "x-client-id": clientId || "" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { items: ConnectionListItem[] } = await res.json();
      setRows(data.items);
    } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error(String(e));
      setError(err?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refetch(); }, []);
  usePolling(() => refetch(), 30_000, true);

  async function connect(provider: Provider) {
    const res = await fetch(`/api/connections/providers/${provider}/connect`, { method: "POST", headers: { "x-client-id": clientId || "" } });
    if (res.ok) {
      const data = await res.json();
      if (data.url) {
        console.log(data.url);
        
        window.location.href = data.url; // OAuth redirect
      } else {
        // Placeholder behavior
        await refetch();
      }
    }
  }

  async function reconnect(id: string) {
    await fetch(`/api/connections/${id}/reconnect`, { method: "POST", headers: { "x-client-id": clientId || "" } });
    await refetch();
  }

  async function disconnect_(id: string) {
    if (!confirm("Disconnect this provider?")) return;
    await fetch(`/api/connections/${id}`, { method: "DELETE", headers: { "x-client-id": clientId || "" } });
    await refetch();
  }

  async function syncNow(id: string) {
    await fetch(`/api/connections/${id}/sync`, { method: "POST", headers: { "x-client-id": clientId || "" } });
    await refetch();
  }

  async function loadLogs(connectionId: string, cursor?: string | null) {
    setLogsLoading(true);
    try {
      const url = new URL(`/api/connections/${connectionId}/logs`, window.location.origin);
      url.searchParams.set('limit', '50');
      if (cursor) url.searchParams.set('cursor', cursor);
      const res = await fetch(url.toString());
      if (res.ok) {
        const data: { items: LogItem[]; nextCursor: string | null } = await res.json();
        setLogs(prev => (cursor ? [...prev, ...data.items.map(m => ({ ...m, createdAt: new Date(m.createdAt).toISOString() }))] : data.items.map(m => ({ ...m, createdAt: new Date(m.createdAt).toISOString() }))));
        setLogsCursor(data.nextCursor);
      }
    } finally { setLogsLoading(false); }
  }

  async function refresh(id: string) {
    await fetch(`/api/connections/${id}/refresh`, { method: 'POST' });
    await refetch();
  }

  function willExpireSoon(expiresAt: Date | null, windowMs = 3 * 24 * 60 * 60 * 1000) {
    if (!expiresAt) return false; // some providers don't expire (short-lived access + refresh exists)
    return expiresAt.getTime() - Date.now() <= windowMs;
  }

  return (
    <ToastsProvider>
      <div className="max-w-4xl mt-4 mx-auto space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold">Connections</h1>
            <p className="text-sm text-muted-foreground mt-1">Подключения рекламных каналов. Изменения применяются безопасно; без явного &quot;Apply&quot; в аккаунтах ничего не меняется.</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>

        {/* Connect quick actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Connect a provider</CardTitle>
            <CardDescription>Быстрый старт. Выберите платформу для подключения.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(["meta_ads","google_ads","tt","linkedin","other"] as Provider[]).map((p) => (
              <Button key={p} variant="secondary" size="sm" onClick={() => connect(p)}>
                <span className="mr-2">{PROVIDER_ICON[p]}</span>
                {PROVIDER_LABEL[p]}
              </Button>
            ))}

            
          </CardContent>
        </Card>

        <Separator />

        {/* Existing connections */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Connected accounts</CardTitle>
            <CardDescription>Управляйте статусом, ре-авторизацией, ручным импортом и см. детали аккаунтов.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && <div className="py-8 text-sm text-muted-foreground">Loading…</div>}
            {!loading && error && <div className="py-8 text-sm text-destructive">{error}</div>}

            {!loading && !error && rows && rows.length === 0 && (
              <div className="py-8 text-sm text-muted-foreground">Ещё нет подключений. Нажмите одну из кнопок выше, чтобы подключить.</div>
            )}

            {!loading && !error && rows && rows.length > 0 && (
              <div className="space-y-5">
                {rows.map((row) => (
                  <div key={row.id} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {PROVIDER_ICON[row.provider.toLowerCase()]}
                        <div>
                          <div className="font-medium">{PROVIDER_LABEL[row.provider.toLowerCase() as Provider]}</div>
                          <div className="text-xs text-muted-foreground">Scopes: {row.scopes?.length ? row.scopes.join(", ") : "—"}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                        <Badge variant={statusToBadge[row.status].variant}>{statusToBadge[row.status].label}</Badge>
                          {row.expiresAt && willExpireSoon(new Date(row.expiresAt)) && (
                            <span className="ml-2 text-xs text-amber-600">Expires soon</span>
                          )}
                          {row?.health?.rateLimited && (
                            <span className="ml-2 text-xs text-amber-600">Rate limited</span>
                          )}
                        </div>
                        <Button size="sm" variant="outline" onClick={() => syncNow(row.id)}>Import now</Button>
                        <Button size="sm" variant="outline" onClick={() => refresh(row.id)}>Refresh token</Button>
                        {row.status === "needs_reauth" ? (
                          <Button size="sm" onClick={() => reconnect(row.id)}>Re-connect</Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => reconnect(row.id)}>Re-auth</Button>
                        )}
                        <Button size="sm" variant="destructive" onClick={() => disconnect_(row.id)}>Disconnect</Button>

                        <Dialog open={logOpenFor === row.id} onOpenChange={(o) => { if (!o) { setLogOpenFor(null); setLogs([]); setLogsCursor(null); } }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" onClick={() => { setLogOpenFor(row.id); loadLogs(row.id); }}>View logs</Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Logs — {PROVIDER_LABEL[row.provider]}</DialogTitle>
                            </DialogHeader>
                            <div className="max-h-[60vh] overflow-auto text-sm">
                              {logs.length === 0 && !logsLoading && <div className="text-muted-foreground">No logs yet.</div>}
                              <ul className="space-y-2">
                                {logs.map((l) => (
                                  <li key={l.id} className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="font-mono text-xs text-muted-foreground">{new Date(l.createdAt).toLocaleString()}</div>
                                      <div className="font-medium">{l.type}</div>
                                      {l.message && <div className="text-muted-foreground">{l.message}</div>}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                              {logsCursor && (
                                <div className="mt-4">
                                  <Button variant="outline" size="sm" onClick={() => loadLogs(row.id, logsCursor)} disabled={logsLoading}>Load more</Button>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    <div className="grid grid-cols-12 text-sm mt-3">
                      <div className="col-span-4 text-muted-foreground">Last sync</div>
                      <div className="col-span-4 text-muted-foreground">Token expires</div>
                      <div className="col-span-4 text-muted-foreground">Last error</div>
                      <div className="col-span-4">{timeAgo(row.lastSyncAt)}</div>
                      <div className="col-span-4">{row.expiresAt ? new Date(row.expiresAt).toLocaleString() : "—"}</div>
                      <div className="col-span-4">{row.lastError || "—"}</div>
                    </div>

                    {/* Accounts table */}
                    <div className="mt-4">
                      <div className="grid grid-cols-12 text-xs text-muted-foreground px-1">
                        <div className="col-span-5">Account</div>
                        <div className="col-span-2">Currency</div>
                        <div className="col-span-2">Timezone</div>
                        <div className="col-span-3 text-right">Last import</div>
                      </div>
                      <div className="divide-y">
                        {row.accounts.map(acc => (
                          <div key={acc.id} className="grid grid-cols-12 items-center py-2">
                            <div className="col-span-5">
                              <div className="font-medium">{acc.name}</div>
                              <div className="text-xs text-muted-foreground">{acc.externalAccountId}</div>
                            </div>
                            <div className="col-span-2">{acc.currency}</div>
                            <div className="col-span-2">{acc.timezone}</div>
                            <div className="col-span-3 text-right">{timeAgo(acc.lastImportedAt)}</div>
                          </div>
                        ))}
                        {row.accounts.length === 0 && (
                          <div className="py-3 text-sm text-muted-foreground">Нет аккаунтов. Выполните импорт после подключения.</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ToastsProvider>
  );
}
