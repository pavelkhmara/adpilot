'use client';
export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CampaignTable } from "../../components/dashboard/CampaignTable";
import FiltersBar from "../../components/dashboard/FiltersBar";
import Alerts from "../../components/dashboard/Alerts";
import ImportCsvDialog from "../../components/dashboard/ImportCsvDialog";
import { ToastsProvider, useToasts } from "../../components/dashboard/Toasts";
import { CampaignModal } from "../../components/dashboard/CampaignModal";
import type { CampaignModalData, CampaignAction } from "../../components/dashboard/CampaignModal";
import { useUrlSync } from "../../features/campaigns/hooks/useUrlSync";
import { useCampaigns } from "../../features/campaigns/hooks/useCampaigns";
import DashboardHeader from "../../components/dashboard/Header/DashboardHeader";
import KpiCard from "../../components/dashboard/KpiCard";
import { CampaignRow, Channel, ClientId } from "../../lib/types";
import { toClientId } from "../../lib/utils";
import Connections from "../../components/dashboard/Connections";
import ActionsLog, { type ActionEntry } from "../../components/dashboard/ActionsLog";
import SettingsModal from "../../components/dashboard/SettingsModal";
import HotKeysModal from "../../components/dashboard/HotKeysModal";
import { ConnectionsPanel } from "@/components/connections/ConnectionsPanel";

// ----- constants / types -----


const CLIENTS: { id: ClientId; name: string }[] = [
  { id: "acme",  name: "Acme Store" },
  { id: "orbit", name: "Orbit Gear" },
  { id: "nova",  name: "Nova Beauty" },
  { id: "zen",   name: "Zen Home" },
];

const SORT_KEYS = ["channel","name","spend","revenue","roas","cpa","ctr","frequency","recommendation"] as const;
type SortKey = typeof SORT_KEYS[number];



type DemoSettings = {
  minSpendForPause: number;
  lowRoasThreshold: number;
  highRoasThreshold: number;
  minConversionsForScale: number;
  fatigueFreq: number;
  lowCtrThreshold: number;
  columns?: {
    spend: boolean; revenue: boolean; roas: boolean; cpa: boolean; ctr: boolean; recommendation: boolean; actions: boolean;
  };
  compact?: boolean;
};

const DEFAULT_SETTINGS: DemoSettings = {
  minSpendForPause: 1000,
  lowRoasThreshold: 1.5,
  highRoasThreshold: 3.0,
  minConversionsForScale: 50,
  fatigueFreq: 2.5,
  lowCtrThreshold: 0.02,
  columns: { spend: true, revenue: true, roas: true, cpa: true, ctr: true, recommendation: true, actions: true },
  compact: false,
};


// ----- helper functions -----


function toSortKey(v: string | null | undefined): SortKey | null {
  return SORT_KEYS.includes(v as SortKey) ? (v as SortKey) : null;
}
function toDir(v: string | null | undefined): "asc" | "desc" {
  return v === "asc" || v === "desc" ? v : "desc";
}
// ----- page shell -----

export default function DashboardPage() {
  return (
    <ToastsProvider>
      <Suspense fallback={<div />}>
        <DashboardInner />
      </Suspense>
    </ToastsProvider>
  );
}

// ----- main component -----

function DashboardInner() {
  const clientUniqueId = 'cmg0y75gj00du7kocwj8o4s8n';
  const sp = useSearchParams();
  const { pushToast } = useToasts();

  const [clientId, setClientId] = useState<ClientId>(() => toClientId(sp.get("client")));
  const [readOnly] = useState<boolean>(() => sp.get("mode") === "ro");
  const [query, setQuery] = useState(() => sp.get("q") ?? "");
  const [channelFilter, setChannelFilter] = useState<"All" | Channel>(
    (sp.get("channel") as Channel) ?? "All"
  );
  const [sortBy, setSortBy] = useState<SortKey | null>(() => toSortKey(sp.get("sort")) ?? "revenue");
  const [sortDir, setSortDir] = useState<"asc"|"desc">(() => toDir(sp.get("dir")));

  function handleSort(col: typeof sortBy) {
    if (!col) return;
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir("desc"); }
  }

  // demo settings (persisted)
  const [settings, setSettings] = useState<DemoSettings>(DEFAULT_SETTINGS);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("adpilot_demo_settings");
      if (raw) setSettings((s) => ({ ...s, ...JSON.parse(raw) }));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("adpilot_demo_settings", JSON.stringify(settings));
    } catch {}
  }, [settings]);

  // features: theme / import dialog / settings modal / hotkeys
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [showHotkeys, setShowHotkeys] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSettingsOpen(false);
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag !== "input" && tag !== "textarea") { e.preventDefault(); searchRef.current?.focus(); }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSettingsOpen(true); }
      if (e.key === "?" || (e.shiftKey && e.key === "/")) { e.preventDefault(); setShowHotkeys((v) => !v); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // server fetch hook (adds dates inside)
  const baseFilters = {
    clientId,
    channel: channelFilter === "All" ? undefined : channelFilter,
    q: query || undefined,
    lowRoas: settings.lowRoasThreshold,
    highRoas: settings.highRoasThreshold,
    minSpendForPause: settings.minSpendForPause,
    minConversionsForScale: settings.minConversionsForScale,
    fatigueFreq: settings.fatigueFreq,
    lowCtr: settings.lowCtrThreshold,
  } as const;

  const {
    rows: campaigns,
    loading: refreshing,
    error: loadError,
    dateFrom, dateTo, setDateFrom, setDateTo,
    refresh: onRefresh,
  } = useCampaigns(baseFilters);

  // keep URL in sync
  useUrlSync({
    client: clientId,
    q: query || undefined,
    channel: channelFilter === "All" ? undefined : channelFilter,
    sort: sortBy || undefined,
    dir: sortBy ? sortDir : undefined,
    mode: readOnly ? "ro" : undefined,
    from: dateFrom || undefined,
    to: dateTo || undefined,
  });

  // table sorting (client-side) -> CampaignTable expects already sorted rows
  const tableRows: CampaignRow[] = useMemo(() => {
  const arr = [...campaigns];
  const key = sortBy;
  if (!key) return arr;

  const cmpNum = (a: number, b: number) => (sortDir === "asc" ? a - b : b - a);
  const cmpStr = (a: string, b: string) =>
    sortDir === "asc" ? a.localeCompare(b) : b.localeCompare(a);

  arr.sort((a, b) => {
    switch (key) {
      case "roas": {
        const av = a.spend > 0 ? a.revenue / a.spend : 0;
        const bv = b.spend > 0 ? b.revenue / b.spend : 0;
        return cmpNum(av, bv);
      }
      case "cpa": {
        const av = a.conversions > 0 ? a.spend / a.conversions : Number.POSITIVE_INFINITY;
        const bv = b.conversions > 0 ? b.spend / b.conversions : Number.POSITIVE_INFINITY;
        return cmpNum(av, bv);
      }
      case "ctr": return cmpNum(a.ctr, b.ctr);
      case "frequency": return cmpNum(a.frequency, b.frequency);
      case "spend": return cmpNum(a.spend, b.spend);
      case "revenue": return cmpNum(a.revenue, b.revenue);
      case "channel": return cmpStr(a.channel, b.channel);
      case "name": return cmpStr(a.name, b.name);
      case "recommendation": {
        const order = (t?: CampaignRow["recommendation"]) =>
          !t ? 9 : t.type === "pause" ? 0 : t.type === "scale" ? 1 : t.type === "creative" ? 2 : 8;
        return cmpNum(order(a.recommendation), order(b.recommendation));
      }
      default: return 0;
    }
  });

  return arr;
}, [campaigns, sortBy, sortDir]);


  // totals (simple KPI)
  const totals = useMemo(() => {
    const base = { spend: 0, revenue: 0, conversions: 0, clicks: 0, ctrSum: 0 };
    const agg = campaigns.reduce((acc, c) => {
      acc.spend += c.spend; acc.revenue += c.revenue; acc.conversions += c.conversions; acc.clicks += c.clicks; acc.ctrSum += c.ctr;
      return acc;
    }, base);
    return {
      spend: `€${agg.spend.toFixed(2)}`,
      revenue: `€${agg.revenue.toFixed(2)}`,
      roas: agg.spend ? (agg.revenue / agg.spend).toFixed(2) : "0.00",
      cpa: agg.conversions ? `€${(agg.spend / agg.conversions).toFixed(2)}` : "—",
      ctr: campaigns.length ? `${((agg.ctrSum / campaigns.length) * 100).toFixed(2)}%` : "—",
    };
  }, [campaigns]);

  // campaign modal
  const [selected, setSelected] = useState<CampaignModalData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [audit, setAudit] = useState<ActionEntry[]>([]);

  function openCampaign(row: CampaignRow) {
    const data: CampaignModalData = {
      id: row.id,
      channel: row.channel,
      name: row.name,
      status: row.status,
      impressions: row.impressions,
      clicks: row.clicks,
      spend: row.spend,
      conversions: row.conversions,
      revenue: row.revenue,
      frequency: row.frequency,
      ctr: row.ctr,
      recommendation: row.recommendation,
      raw: row,
    };
    setSelected(data);
    setModalOpen(true);
  }
  function handleAction(a: CampaignAction) {
    if (a.type === "pause") pushToast("Paused (demo)");
    else if (a.type === "scale") pushToast(`Scaled by +${Math.round(a.by * 100)}% (demo)`);
    else if (a.type === "rotate_creatives") pushToast("Rotate creatives (demo)");
  }

  function onGenerateAction(row: CampaignRow) {
    const recType = row.recommendation?.type ?? "none";
    const entry: ActionEntry = {
      ts: new Date().toISOString(),
      campaign: row.name,
      channel: row.channel,
      action: recType,
      title: row.recommendation?.title ?? "no-op",
    };
    setAudit((prev) => [entry, ...prev]);

    // при желании можно сразу открыть модалку:
    setSelected({
      id: row.id,
      channel: row.channel,
      name: row.name,
      status: row.status,
      impressions: row.impressions,
      clicks: row.clicks,
      spend: row.spend,
      conversions: row.conversions,
      revenue: row.revenue,
      frequency: row.frequency,
      ctr: row.ctr,
      recommendation: row.recommendation,
      raw: row,
    });
    setModalOpen(true);
  }

  // alerts: берём из уже отфильтрованных кампаний
  const alertsRows = useMemo(
    () => campaigns.map(c => ({ id: c.id, name: c.name, channel: c.channel, spend: c.spend, recommendation: c.recommendation })),
    [campaigns]
  );

  function download(filename: string, text: string) {
    const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    }

    function toCsv(rows: CampaignRow[]) {
    const headers = ["Channel","Campaign","Status","Spend","Revenue","ROAS","CPA","CTR"];
    const lines = rows.map((c) => [
      c.channel, c.name, c.status,
      c.spend.toFixed(2), c.revenue.toFixed(2),
      c.roasTrend, c.cpaTrend ? c.cpaTrend : "",
      (c.ctr * 100).toFixed(2) + "%"
    ]);
    const csv = [headers, ...lines]
      .map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(","))
      .join("\n");
    return csv;
  }

    function onExportCsv() {
      const csv = toCsv(tableRows);
      download(`adpilot_campaigns_${new Date().toISOString().slice(0,10)}.csv`, csv);
      pushToast("CSV exported");
    }

    function buildReadonlyLink(): string {
    const params = new URLSearchParams();
    if (clientId) params.set("client", clientId);
    if (query) params.set("q", query);
    if (channelFilter !== "All") params.set("channel", channelFilter);
    if (sortBy) {
      params.set("sort", sortBy);
      params.set("dir", sortDir);
    }
    // params.set("from", dateFrom);
    // params.set("to", dateTo);

    params.set("mode", "ro");
    const qs = params.toString();
    return `${window.location.origin}${window.location.pathname}${qs ? `?${qs}` : ""}`;
  }

  function shareReadOnlyLink() {
    const link = buildReadonlyLink();
    navigator.clipboard.writeText(link).then(() => pushToast("Read-only link copied")).catch(() => {});
  }


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
      {/* Header */}
      <DashboardHeader 
        readOnly={readOnly} 
        onRefresh={onRefresh} 
        refreshing={refreshing}
        setSettingsOpen={setSettingsOpen}
        setImportOpen={setImportOpen}
        loadError={loadError}
        clientId={clientId}
        clientsList={CLIENTS}
        setClientId={(id) => setClientId(id)}
        onExportCsv={onExportCsv}
        shareReadOnlyLink={shareReadOnlyLink}
      />

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6 text-gray-900 dark:text-gray-100">
        {/* Connections */}
        <ConnectionsPanel clientId={clientUniqueId} />
        <Connections />

        {/* KPIs */}
        <section className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Spend (period)" value={totals.spend} />
          <KpiCard label="Revenue (period)" value={totals.revenue} />
          <KpiCard label="ROAS" value={totals.roas} />
          <KpiCard label="CPA" value={totals.cpa} />
        </section>

        {/* Filters */}
        <FiltersBar
          channel={channelFilter}
          onChannelChange={(ch) => setChannelFilter(ch)}
          query={query}
          onQueryChange={setQuery}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFrom={setDateFrom}
          onDateTo={setDateTo}
          onRefresh={onRefresh}
          readOnly={readOnly}
          refreshing={refreshing}
          setImportOpen={setImportOpen}
          onExportCsv={onExportCsv}
          resetSort={handleSort}
          searchRef={searchRef}
        />

        {/* Alerts */}
        <Alerts
          rows={alertsRows}
          onOpen={(id) => {
            const r = campaigns.find(x => x.id === id);
            if (r) openCampaign(r);
          }}
        />

        {/* Table */}
        <CampaignTable
          rows={tableRows}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
          onOpenCampaign={openCampaign}
          loading={refreshing}
          onGenerateAction={onGenerateAction}
        />

        <ActionsLog
          entries={audit}
          onClear={() => setAudit([])}
        />
      </main>

      {/* Campaign modal */}
      <CampaignModal open={modalOpen} data={selected} onClose={() => setModalOpen(false)} onAction={handleAction} />

      {/* Import */}
      <ImportCsvDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        clients={CLIENTS}
        initialClientId={clientId}
        onImported={async () => { await onRefresh(); }}
        pushToast={pushToast}
      />

      {/* Settings (demo) */}
      {settingsOpen && (
      <SettingsModal
        settings={settings}
        setSettings={setSettings}
        setSettingsOpen={setSettingsOpen}
        defaultSettings={DEFAULT_SETTINGS}
      />
    )}

      {/* Hotkeys help */}
      {showHotkeys && (
        <HotKeysModal setShowHotkeys={setShowHotkeys} />
      )}
    </div>
  );
}

