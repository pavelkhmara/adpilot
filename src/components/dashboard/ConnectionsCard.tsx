"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../../components/UI/card";
import { Badge } from "../../components/UI/Badge";
import { Button } from "../../components/UI/button";
import type { ConnectionSummaryItem, ConnectionSummaryResponse } from "../../lib/types/connections";
import { usePolling } from '../../lib/hooks/usePolling';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../components/UI/accordion"

// --- Small helpers ---
const STATUS_ORDER: Record<ConnectionSummaryItem["status"], number> = {
    disconnected:6,
    error: 5,
    needs_reauth: 4,
    syncing: 3,
    connected: 2,
    not_connected: 1,
};

const statusToBadge: Record<ConnectionSummaryItem["status"], { variant: "default" | "secondary" | "destructive" | "outline"; label: string } > = {
    disconnected: { variant: "destructive", label: "Disconnected"},
    connected: { variant: "default", label: "Connected" },
    syncing: { variant: "secondary", label: "Syncing" },
    needs_reauth: { variant: "destructive", label: "Re-auth" },
    error: { variant: "destructive", label: "Error" },
    not_connected: { variant: "outline", label: "Not connected" },
};

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  try {
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
  } catch {
    return "—";
  }
}

const PROVIDER_ICON: Record<string, React.ReactNode> = {
  meta_ads: <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />, // swap to proper icon if you have one
  google_ads: <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-500" />,
  tt: <span className="inline-block w-2.5 h-2.5 rounded-full bg-pink-500" />,
  linkedin: <span className="inline-block w-2.5 h-2.5 rounded-full bg-sky-600" />,
  other: <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-400" />,
};

// --- Skeleton ---
function RowSkeleton() {
  return (
    <div className="grid grid-cols-12 items-center py-2">
      <div className="col-span-4 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
        <div className="h-4 w-20 bg-muted rounded" />
      </div>
      <div className="col-span-3"><div className="h-5 w-24 bg-muted rounded" /></div>
      <div className="col-span-2"><div className="h-5 w-12 bg-muted rounded" /></div>
      <div className="col-span-3 flex justify-end"><div className="h-8 w-24 bg-muted rounded" /></div>
    </div>
  );
}

// --- Main component ---
export default function ConnectionsCard({ clientId }: { clientId: string }) {

  
  const [items, setItems] = useState<ConnectionSummaryItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        
        const res = await fetch("/api/connections/summary", { headers: { "x-client-id": clientId || "" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ConnectionSummaryResponse = await res.json();
        
        if (!cancelled) setItems(data.items);
      } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error(String(e));
        if (!cancelled) setError(err?.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  usePolling(() => (async () => {
    try {
      const res = await fetch('/api/connections/summary', { headers: { 'x-client-id': clientId || '' } });
      if (res.ok) {
        const data: ConnectionSummaryResponse = await res.json();
        setItems(data.items);
      }
    } catch {}
  })(), 30_000, true);

  const sorted = useMemo(() => {
    return (items ?? []).slice().sort((a, b) => STATUS_ORDER[b.status] - STATUS_ORDER[a.status]);
  }, [items]);


  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Connections</CardTitle>
            <CardDescription className="mt-1">Минимальный обзор подключений и их состояния.</CardDescription>
          </div>
          
          <Button asChild size="sm" variant="outline">
            <Link href={{ pathname: "/settings/connections", query: { clientId }}}>Manage</Link>
          </Button>
        </div>
        
      </CardHeader>

      <CardContent>
        <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
          <AccordionItem value="item-1">
            <AccordionTrigger className="grid grid-cols-12 px-1 text-sm text-muted-foreground">
              {/* <div className="grid grid-cols-12 px-1 text-sm text-muted-foreground"> */}
              <div className="col-span-4">Provider
                <Badge className="ml-2" variant="outline">{sorted.length}</Badge>
              </div>
              <div className="col-span-3">Status - connected 
                <Badge className="ml-2" variant="outline">
                  <span className="inline-block mr-2 w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  {sorted.filter(c => c.status == "connected").length} / {sorted.length}</Badge>
              </div>
              <div className="col-span-2">Accounts
                <Badge className="ml-2" variant="outline">{sorted.reduce((acc, c) => {return acc += c.accountsCount},0)}</Badge>
              </div>
              <div className="col-span-2 text-right">Last sync
                <Badge className="ml-2" variant="outline">{timeAgo(sorted.filter(c => c.status == "connected").map(c => c.lastSyncAt).sort().slice(-1)[0])}</Badge>
              </div>
              {/* </div> */}
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-4 text-balance">
                
                <div className="divide-y">
                  {loading && (
                    <>
                      <RowSkeleton />
                      <RowSkeleton />
                      <RowSkeleton />
                    </>
                  )}

                  {!loading && error && (
                    <div className="py-6 text-sm text-destructive">{error}</div>
                  )}

                  {!loading && !error && sorted.map((it) => (
                    <div key={it.provider} className="grid grid-cols-12 items-center py-2">
                      <div className="col-span-4 flex items-center gap-2">
                        {PROVIDER_ICON[it.provider]}
                        <span className="font-medium capitalize">{it.provider}</span>
                      </div>
                      <div className="col-span-3">
                        <Badge variant={statusToBadge[it.status].variant}>{statusToBadge[it.status].label}</Badge>
                        {it.errorHint ? <span className="ml-2 text-xs text-muted-foreground">{it.errorHint}</span> : null}
                        {it.health?.expiresSoon && <span className="ml-2 text-xs text-amber-600">Expires soon</span>}
                        {it.health?.rateLimited && <span className="ml-2 text-xs text-amber-600">Rate limited</span>}
                      </div>
                      <div className="col-span-2 text-sm">{it.accountsCount}</div>
                      <div className="col-span-3 text-right text-sm">{timeAgo(it.lastSyncAt)}</div>
                    </div>
                  ))}

                  {!loading && !error && sorted.length === 0 && (
                    <div className="py-6 text-sm text-muted-foreground">Пока нет данных. Нажмите «Manage», чтобы подключить канал.</div>
                  )}
                </div>
            </AccordionContent>
          </AccordionItem>
        
        </Accordion>
      </CardContent>

      
    </Card>
  );
}
