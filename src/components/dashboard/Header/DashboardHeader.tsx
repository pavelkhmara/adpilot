import React from 'react'
import Badge from '@/components/UI/Badge'
import { toClientId } from '@/lib/utils'
import type { ClientId } from "@/lib/types";

type ClientOption = { id: ClientId; name: string };

type Props = {
  readOnly: boolean;
  onRefresh: () => void;
  refreshing: boolean;
  setSettingsOpen: (v: boolean) => void;
  setImportOpen: (v: boolean) => void;
  loadError: string | null;
  clientId: ClientId;
  clientsList: ClientOption[];
  setClientId: (id: ClientId) => void;
  onExportCsv: () => void;
  shareReadOnlyLink: () => void;
};

export default function DashboardHeader({ readOnly, onRefresh, refreshing, setSettingsOpen, setImportOpen, loadError, clientId, clientsList, setClientId, onExportCsv, shareReadOnlyLink }: Props ) {
    
  return (
    <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-2xl bg-black text-white grid place-items-center font-bold">A</div>
                <div className="font-semibold">AdPilot</div>
                <Badge tone="blue">MVP Mock</Badge>
                {readOnly && <Badge tone="amber">Read-only</Badge>}
            </div>
            <div className="flex items-center gap-2">
                {!readOnly && (
                    <>
                    {/* <button className="px-3 py-1.5 rounded-xl bg-gray-900 dark:bg-white dark:text-gray-900 text-white text-sm" onClick={onRefresh}>
                        {refreshing ? "Updating…" : "Refresh data"}
                    </button>
                    <button className="px-3 py-1.5 rounded-xl border text-sm" onClick={onExportCsv}>
                        Export CSV
                    </button>
                    <button className="px-3 py-1.5 rounded-xl border text-sm" onClick={() => setImportOpen(true)}>
                        Import CSV
                    </button> */}
                    {/* <button 
                        className="px-3 py-1.5 rounded-xl border text-sm" 
                        onClick={() => setSettingsOpen(true)} 
                        title="Open demo settings"
                        aria-label="Open demo settings"
                    >
                        ⚙️
                    </button> */}
                    <button
                        className="px-3 py-1.5 rounded-xl border text-sm"
                        onClick={shareReadOnlyLink}
                        title="Copy read-only link"
                    >
                        Share (read-only)
                    </button>
                    </>
                )}
                <select
                    className="px-3 py-1.5 rounded-xl border text-sm"
                    value={clientId}
                    onChange={(e) => setClientId(toClientId(e.target.value))}
                    aria-label="Select client"
                >
                    {clientsList.map(c => <option 
                                            className="dark:bg-gray-900 dark:text-white"
                                            key={c.id} value={c.id}
                                            >
                                                {c.name}
                                            </option>
                                        )}
                </select>
                {!readOnly && (
                    <button 
                        className="px-3 py-1.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-sm" 
                        onClick={() => setSettingsOpen(true)} 
                        title="Open demo settings"
                        aria-label="Open demo settings"
                    >
                        ⚙️
                    </button>
                )}
            </div>
        </div>
        {loadError && (
            <div className="bg-red-50 border-t border-red-200">
                <div className="max-w-6xl mx-auto px-4 py-2 text-sm text-red-700  flex items-center justify-between">
                    <span>{loadError}</span>
                    <button className="underline" onClick={() => loadError = null}>Hide</button>
                </div>
            </div>
        )}
    </header>
  )
}
