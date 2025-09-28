"use client";
import React, { useRef, useState } from "react";
import { importCsv } from "../../features/campaigns/api";

export type ClientOption = { id: string; name: string };

export default function ImportCsvDialog({
  open,
  onClose,
  clients,
  initialClientId,
  onImported,
  pushToast,
}: {
  open: boolean;
  onClose: () => void;
  clients: ClientOption[];
  initialClientId: string;
  onImported: () => void;
  pushToast: (t: string) => void;
}) {
  const [clientId, setClientId] = useState(initialClientId);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 border border-app rounded-2xl shadow-xl max-w-lg w-full p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div className="text-xl font-semibold">Import CSV (beta)</div>
          <button className="text-gray-400" onClick={onClose}>✕</button>
        </div>

        <div className="mt-4 space-y-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-gray-600">Client</span>
            <select
              className="px-3 py-2 rounded-xl border border-app bg-app"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-600">CSV-file</span>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="px-3 py-2 rounded-xl border border-app bg-app" />
            <div className="text-xs text-gray-500">
              Minimal columns: date, campaign, channel, impressions, clicks, spend, conversions, revenue. Separator , or ; .
            </div>
          </label>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button className="text-sm text-gray-500 underline" onClick={() => {
            // CSV example
            const sample = `date,campaign,channel,impressions,clicks,spend,conversions,revenue,frequency,ctr
2025-09-01,Brand Search PL,Google Ads,4000,120,120.00,10,950,1.2,0.03
2025-09-01,Retargeting 30d,Meta Ads,6000,240,80.00,12,720,1.8,0.04`;
            navigator.clipboard.writeText(sample);
            pushToast("CSV example copied");
          }}>Copy CSV example</button>

          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded-xl border" onClick={onClose}>Cancel</button>
            <button
              className="px-3 py-2 rounded-xl bg-gray-900 text-white disabled:opacity-60"
              disabled={busy}
              onClick={async () => {
                const file = fileRef.current?.files?.[0];
                if (!file) { pushToast("Choose CSV-file"); return; }
                setBusy(true);
                try {
                  const res = await importCsv(clientId, file);
                  pushToast(`Import OK: campaigns +${res.campaignsCreated}, metrics lines ${res.metricRowsUpserted}`);
                  onImported();
                  onClose();
                } catch (e: unknown) {
                  const err = e instanceof Error ? e : new Error(String(e));
                  pushToast(err?.message || "Import error");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Importing…" : "Import"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
