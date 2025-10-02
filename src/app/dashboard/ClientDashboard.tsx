'use client';

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
import { CampaignRow, Channel, ClientId, Rec } from "../../lib/types";
import Connections from "../../components/dashboard/Connections";
import ActionsLog, { type ActionEntry } from "../../components/dashboard/ActionsLog";
import SettingsModal from "../../components/dashboard/SettingsModal";
import HotKeysModal from "../../components/dashboard/HotKeysModal";
import { ConnectionsPanel } from "../../components/connections/ConnectionsPanel";
import { useRecommendations } from "../../features/campaigns/hooks/fetchRecommendations";
import { toUiRec, type UiRec } from "../../features/campaigns/mapRecToUi";

type CampaignRowUI = Omit<CampaignRow, "recommendation"> & { recommendation?: UiRec };

// ----- props -----
export default function ClientDashboard({ clientId }: { clientId: ClientId }) {
  return (
    <ToastsProvider>
      <Suspense fallback={<div />}>
        <DashboardInner clientId={clientId} />
      </Suspense>
    </ToastsProvider>
  );
}

// ----- main component (CLIENT, не async!) -----
function DashboardInner({ clientId }: { clientId: ClientId }) {
  const sp = useSearchParams();
  const { pushToast } = useToasts();

  const [readOnly] = useState<boolean>(() => sp.get("mode") === "ro");
  const [query, setQuery] = useState(() => sp.get("q") ?? "");
  const [channelFilter, setChannelFilter] = useState<"All" | Channel>(
    (sp.get("channel") as Channel) ?? "All"
  );

  const SORT_KEYS = ["channel","name","spend","revenue","roas","cpa","ctr","frequency","recommendation"] as const;
  type SortKey = typeof SORT_KEYS[number];
  const toSortKey = (v: string | null | undefined): SortKey | null =>
    SORT_KEYS.includes(v as SortKey) ? (v as SortKey) : null;
  const toDir = (v: string | null | undefined): "asc"|"desc" =>
    v === "asc" || v === "desc" ? v : "desc";

  const [sortBy, setSortBy] = useState<SortKey | null>(() => toSortKey(sp.get("sort")) ?? "revenue");
  const [sortDir, setSortDir] = useState<"asc"|"desc">(() => toDir(sp.get("dir")));
  const handleSort = (col: typeof sortBy) => {
    if (!col) return;
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir("desc"); }
  };

  // demo settings (persisted)
  type DemoSettings = {
    minSpendForPause: number; lowRoasThreshold: number; highRoasThreshold: number;
    minConversionsForScale: number; fatigueFreq: number; lowCtrThreshold: number;
    columns?: { spend: boolean; revenue: boolean; roas: boolean; cpa: boolean; ctr: boolean; recommendation: boolean; actions: boolean; };
    compact?: boolean;
  };
  const DEFAULT_SETTINGS: DemoSettings = {
    minSpendForPause: 1000, lowRoasThreshold: 1.5, highRoasThreshold: 3.0,
    minConversionsForScale: 50, fatigueFreq: 2.5, lowCtrThreshold: 0.02,
    columns: { spend: true, revenue: true, roas: true, cpa: true, ctr: true, recommendation: true, actions: true },
    compact: false,
  };
  const [settings, setSettings] = useState<DemoSettings>(DEFAULT_SETTINGS);
  useEffect(() => { try { const raw = localStorage.getItem("adpilot_demo_settings"); if (raw) setSettings(s => ({ ...s, ...JSON.parse(raw) })); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem("adpilot_demo_settings", JSON.stringify(settings)); } catch {} }, [settings]);

  // ui state
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
      if (e.key === "?" || (e.shiftKey && e.key === "/")) { e.preventDefault(); setShowHotkeys(v => !v); }
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
    campaigns,
    loading: refreshing,
    error: loadError,
    dateFrom, dateTo, setDateFrom, setDateTo,
    refresh: onRefresh,
  } = useCampaigns(baseFilters);

  const campaignIds = useMemo<string[]>(
    () => campaigns.map((c: CampaignRow) => c.id),
    [campaigns]
  );
  const { map: recMap, refresh: refreshRecs, mutate: mutateRec } =
  useRecommendations(campaignIds, baseFilters.clientId);
    

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

  const campaignsWithRec: CampaignRowUI[] = useMemo(() => {
    if (!campaigns || campaigns.length === 0) return [];
    return campaigns.map((c: CampaignRow) => {
      const ui: UiRec | undefined = recMap[c.id]
        ? toUiRec(recMap[c.id])                 // DB → UI
        : (c.recommendation as UiRec | undefined);
      return { ...c, recommendation: ui };
    });
  }, [campaigns, recMap]);

  // table sorting
  const tableRows: CampaignRowUI[] = useMemo(() => {
    const arr = [...campaignsWithRec];
    const key = sortBy;
    if (!key) return arr;

    const cmpNum = (a: number, b: number) => (sortDir === "asc" ? a - b : b - a);
    const cmpStr = (a: string, b: string) => (sortDir === "asc" ? a.localeCompare(b) : b.localeCompare(a));

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
        case "ctr": return cmpNum(a?.ctr, b.ctr);
        case "frequency": return cmpNum(a.frequency, b.frequency);
        case "spend": return cmpNum(a.spend, b.spend);
        case "revenue": return cmpNum(a.revenue, b.revenue);
        case "channel": return cmpStr(a.channel, b.channel);
        case "name": return cmpStr(a.name, b.name);
        case "recommendation": {
          const order = (t?: UiRec) =>
            !t ? 9 : t.type === "pause" ? 0 : t.type === "scale" ? 1 : t.type === "creative" ? 2 : 8;
          return cmpNum(order(a.recommendation), order(b.recommendation));
        }
        default: return 0;
      }
    });

    return arr;
  }, [campaignsWithRec, sortBy, sortDir]);  

  // totals
  const totals = useMemo(() => {
    const base = { spend: 0, revenue: 0, conversions: 0, clicks: 0, ctrSum: 0 };
    const agg = campaigns.reduce((acc, c: CampaignRow) => {
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

  // campaign modal / audit
  const [selected, setSelected] = useState<CampaignModalData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [audit, setAudit] = useState<ActionEntry[]>([]);
  const openCampaign = (row: CampaignRow) => {
    const dbRec = recMap[row.id];
    const data: CampaignModalData = { ...row, recommendation: dbRec, raw: row };
    setSelected(data); setModalOpen(true);
  };

  const handleAction = async (a: CampaignAction) => {
    await fetch("/api/recommendations/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...a, id: a.id, by: `user: \${userId}` }),
    });

    if (a.type === "pause") pushToast("Paused (demo)");
    else if (a.type === "scale") pushToast(`Scaled by +${Math.round(a.scaleBy * 100)}% (demo)`);
    else if (a.type === "rotate_creatives") pushToast("Rotate creatives (demo)");

    if (selected?.id) {
      mutateRec(selected.id, { status: "applied" });
    }
    setSelected(prev => prev ? {
      ...prev,
      recommendation: prev.recommendation
        ? { ...prev.recommendation, status: "applied" }
        : prev.recommendation
    } : prev);
    refreshRecs();
  };

  async function onDismiss(rec: Rec | undefined, reason?: string) {
    const res = await fetch("/api/recommendations/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rec?.id, by: `user:\${userId}`, reason }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      pushToast("Dismiss failed");
      return ;
    }

    if (selected?.id) {
      mutateRec(selected.id, { status: "dismissed" });
    }
    setSelected(prev => prev ? {
      ...prev,
      recommendation: prev.recommendation
        ? { ...prev.recommendation, status: "dismissed" }
        : prev.recommendation
    } : prev);
    refreshRecs();
  }

  async function onSnooze(rec: Rec, untilISO: string, note?: string) {
    const res = await fetch("/api/recommendations/snooze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rec.id, by: `user:\${userId}`, until: untilISO, note }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      pushToast("Snooze failed");
      return;
    }

    setSelected(prev => prev ? {
      ...prev,
      recommendation: prev.recommendation
        ? { ...prev.recommendation, validUntil: untilISO, status: "proposed" }
        : prev.recommendation
    } : prev);

    if (selected?.id) mutateRec(selected.id, { validUntil: new Date(untilISO).toISOString(), status: "proposed" });

    refreshRecs();
  }


  const onGenerateAction = (row: CampaignRow) => {
    const recType = row.recommendation?.type ?? "none";
    const entry: ActionEntry = {
      ts: new Date().toISOString(),
      campaign: row.name,
      channel: row.channel,
      action: recType,
      title: row.recommendation?.reason ?? "no-op",
    };
    setAudit(prev => [entry, ...prev]);
    const dbRec = recMap[row.id]; // Rec | undefined
    setSelected({ ...row, recommendation: dbRec, raw: row });
    setModalOpen(true);
  };

  const alertsRows = useMemo(
    () => campaignsWithRec.map((c: CampaignRowUI) => ({ id: c.id, name: c.name, channel: c.channel, spend: c.spend, recommendation: c.recommendation })),
    [campaignsWithRec]
  );

  // CSV
  function download(filename: string, text: string) {
    const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  function toCsv(rows: CampaignRow[]) {
    const headers = ["Channel","Campaign","Status","Spend","Revenue","ROAS","CPA","CTR"];
    const lines = rows.map((c) => [
      c.channel, c.name, c.status,
      c.spend.toFixed(2), c.revenue.toFixed(2),
      c.roasTrend, c.cpaTrend ? c.cpaTrend : "",
      (c.ctr * 100).toFixed(2) + "%"
    ]);
    const csv = [headers, ...lines].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
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
    if (sortBy) { params.set("sort", sortBy); params.set("dir", sortDir); }
    params.set("mode", "ro");
    const qs = params.toString();
    return `${window.location.origin}${window.location.pathname}${qs ? `?${qs}` : ""}`;
  }

  function shareReadOnlyLink() {
    const link = buildReadonlyLink();
    navigator.clipboard.writeText(link).then(() => pushToast("Read-only link copied")).catch(() => {});
  }

  async function onLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    } catch {}
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
      <DashboardHeader
        readOnly={readOnly}
        setSettingsOpen={setSettingsOpen}
        loadError={loadError}
        shareReadOnlyLink={shareReadOnlyLink}
        onLogout={onLogout}
      />

      <main className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6 text-gray-900 dark:text-gray-100">
        <ConnectionsPanel clientId={clientId} />
        <Connections />

        <section className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Spend (period)" value={totals.spend} />
          <KpiCard label="Revenue (period)" value={totals.revenue} />
          <KpiCard label="ROAS" value={totals.roas} />
          <KpiCard label="CPA" value={totals.cpa} />
        </section>

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

        <Alerts
          rows={alertsRows}
          onOpen={(id) => {
            const r = (campaigns ?? []).find((x: CampaignRow) => x.id === id);
            if (r) openCampaign(r);
          }}
        />

        <CampaignTable
          rows={tableRows}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
          onOpenCampaign={openCampaign}
          loading={refreshing}
          onGenerateAction={onGenerateAction}
        />

        <ActionsLog entries={audit} onClear={() => setAudit([])} />
      </main>

      <CampaignModal open={modalOpen} data={selected} onClose={() => setModalOpen(false)} onAction={handleAction} onDismiss={onDismiss} onSnooze={onSnooze} />

      <ImportCsvDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        clients={[]}                // ⟵ пусто, чтобы не показывать селект клиентов
        initialClientId={clientId}
        onImported={async () => { await onRefresh(); }}
        pushToast={pushToast}
      />

      {settingsOpen && (
        <SettingsModal
          settings={settings}
          setSettings={setSettings}
          setSettingsOpen={setSettingsOpen}
          defaultSettings={{
            minSpendForPause: 1000, lowRoasThreshold: 1.5, highRoasThreshold: 3.0,
            minConversionsForScale: 50, fatigueFreq: 2.5, lowCtrThreshold: 0.02,
            columns: { spend: true, revenue: true, roas: true, cpa: true, ctr: true, recommendation: true, actions: true },
            compact: false,
          }}
        />
      )}

      {showHotkeys && <HotKeysModal setShowHotkeys={setShowHotkeys} />}
    </div>
  );
}
