"use client";
import React, { useState } from "react";
import { addDays, fmt, isValidYmd } from "@/lib/dates";
import { Channel } from "@/lib/types";

export type ClientOption = { id: string; name: string };

type Props = {
  channel: Channel | "All";
  onChannelChange: (ch: Channel | "All") => void;

  query: string;
  onQueryChange: (q: string) => void;

  dateFrom: string;
  dateTo: string;
  onDateFrom: (v: string) => void;
  onDateTo: (v: string) => void;

  onRefresh: () => void;
  readOnly: boolean;
  refreshing: boolean;
  onExportCsv: () => void;
  setImportOpen: (v: boolean) => void;
  resetSort: (v: null) => void;
  searchRef?: React.Ref<HTMLInputElement>;
}

const FiltersBar = React.forwardRef<HTMLInputElement, Omit<Props, "searchRef"> & { searchRef?: React.Ref<HTMLInputElement> }>(
 function FiltersBar({
  channel,
  onChannelChange,
  query,
  onQueryChange,
  dateFrom,
  dateTo,
  onDateFrom,
  onDateTo,
  onRefresh,
  readOnly,
  refreshing,
  onExportCsv,
  setImportOpen,
  resetSort,
  searchRef,
}) {
  const [ onlyActive, setOnlyActive ] = useState(true);

  function applyPreset(p: "7d" | "14d" | "30d" | "mtd" | "prev m") {
    const now = new Date();
    if (p === "mtd") {
      const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      onDateFrom(fmt(first)); onDateTo(fmt(now)); return;
    }
    if (p === "prev m") {
      const firstPrev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      const lastPrev  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
      onDateFrom(fmt(firstPrev)); onDateTo(fmt(lastPrev)); return;
    }
    const map = { "7d": 6, "14d": 13, "30d": 29 } as const;
    onDateFrom(fmt(addDays(now, -map[p]))); onDateTo(fmt(now));
  }

  const disabledRefresh = !(isValidYmd(dateFrom) && isValidYmd(dateTo));

  return (
    <section className="panel flex flex-col gap-4 p-4">
      {/* First row */}
      <div className="flex w-full flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
                {(["All", "Google Ads", "Meta Ads"] as const).map((ch) => (
                    <button
                    key={ch}
                    onClick={() => onChannelChange(ch)}
                    className={`chip ${channel === ch ? 'chip-active' : ''}`}
                    >
                    {ch}
                    </button>
                ))}
            </div>
            
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
            
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <div className="relative">
                  <input 
                  type="checkbox" 
                  checked={onlyActive} 
                  onChange={(e) => setOnlyActive(e.target.checked)}
                  className="sr-only"
                  />
                  <div className={`w-8 h-4 rounded-full transition-colors ${
                  onlyActive ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}></div>
                  <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                  onlyActive ? 'transform translate-x-4' : ''
                  }`}></div>
              </div>
              <span className="text-gray-600 dark:text-gray-300">Only active</span>
            </label>
        </div>

            <div className="flex flex-col">
              <div className="flex items-center align-top gap-2">
                <input
                    className="pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 w-64"
                    placeholder="Searching for campaigns…"
                    ref={searchRef}
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                  />

                <button
                  className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-100"
                  // className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={() => {
                    onQueryChange("");
                    onChannelChange("All");
                    resetSort(null);
                  }}
                  title="Reset filters and sort"
                >
                  Reset filters
                </button>
              </div>
              <div className="text-xs text-gray-400">Press «/» to search</div>
            </div>

              
            {/* Right slot - Buttons */}
            
      </div>

      {/* Second row */}
      <div className="flex w-full justify-between items-center">
        <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">Period:</span>
            
            <div className="flex items-center gap-2">
                <input
                type="date"
                value={dateFrom}
                onChange={(e) => onDateFrom(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                />
                <span className="text-gray-400">—</span>
                <input
                type="date"
                value={dateTo}
                onChange={(e) => onDateTo(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                />
            </div>

            <div className="flex items-center gap-1">
              {(["7d","14d","30d","mtd","prev m"] as const).map(p => (
                <button
                  key={p}
                  className="px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                  onClick={() => applyPreset(p)}
                  title={`Preset: ${p}`}
                >
                  {p}
                </button>
              ))}
            </div>
        </div>
        {!readOnly && (
              <div className="flex items-center gap-2">
                <button className="px-3 py-2 rounded-xl border text-sm"  onClick={onExportCsv}>
                  Export CSV
                </button>
                <button className="px-3 py-2 rounded-xl border text-sm" onClick={() => setImportOpen(true)}>
                  Import data
                </button>
                <button
                  className="px-3 py-2 rounded-xl bg-gray-900 dark:bg-white dark:text-gray-900 text-white text-sm"
                  onClick={onRefresh}
                  disabled={disabledRefresh}
                >
                  {refreshing ? "Updating…" : "Refresh data"}
                </button>
              </div>
            )}
      </div>
    </section>
  );
}
);

export default FiltersBar;