'use client';
export const dynamic = 'force-dynamic';
import { Suspense, useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getCampaigns, type CampaignDTO, type Channel, type ClientId } from "@/lib/adpilot";


const CLIENTS: { id: ClientId; name: string }[] = [
  { id: "acme",  name: "Acme Store" },
  { id: "orbit", name: "Orbit Gear" },
  { id: "nova",  name: "Nova Beauty" },
  { id: "zen",   name: "Zen Home" },
];

type RecType = "hold" | "pause" | "scale" | "creative";
type Tone = "gray" | "green" | "red" | "amber" | "blue";

type RecAction =
  | { kind: "pause_campaign" }
  | { kind: "increase_budget"; by: number }
  | { kind: "rotate_creatives" }
  | null;

interface Recommendation {
  type: RecType;
  title: string;
  reason: string;
  risk?: string;
  action: RecAction;
}

type Campaign = CampaignDTO;

interface DerivedCampaign extends Campaign {
  roas: number;
  cpa: number | null;
  recommendation: Recommendation | null;
}

interface AuditEntry {
  ts: string;
  campaign: string;
  channel: Channel;
  action: string;
  title: string;
}

type DemoSettings = {
  minSpendForPause: number;
  lowRoasThreshold: number;
  highRoasThreshold: number;
  minConversionsForScale: number;
  fatigueFreq: number;
  lowCtrThreshold: number;
};

const DEFAULT_SETTINGS: DemoSettings = {
  minSpendForPause: 1000,
  lowRoasThreshold: 1.5,
  highRoasThreshold: 3.0,
  minConversionsForScale: 50,
  fatigueFreq: 2.5,
  lowCtrThreshold: 0.02,
};

interface ActionPayload {
  clientId: ClientId;
  channel: Channel;
  campaignId: string;
  recommendation: RecType;
  change:
    | { op: "pause" }
    | { op: "budget_increase"; byPercent: number }
    | { op: "rotate_creatives" };
  meta: {
    generatedAt: string;    // ISO
    dryRun: boolean;        // для безопасности
    source: "ui-demo";
  };
}

function buildActionPayload(c: DerivedCampaign, clientId: ClientId): ActionPayload | null {
  const rec = c.recommendation;
  if (!rec) return null;
  if (rec.type === "pause") {
    return {
      clientId,
      channel: c.channel,
      campaignId: c.id,
      recommendation: rec.type,
      change: { op: "pause" },
      meta: { generatedAt: new Date().toISOString(), dryRun: true, source: "ui-demo" },
    };
  }
  if (rec.type === "scale" && rec.action && rec.action.kind === "increase_budget") {
    return {
      clientId,
      channel: c.channel,
      campaignId: c.id,
      recommendation: rec.type,
      change: { op: "budget_increase", byPercent: Math.round((rec.action.by ?? 0) * 100) },
      meta: { generatedAt: new Date().toISOString(), dryRun: true, source: "ui-demo" },
    };
  }
  if (rec.type === "creative") {
    return {
      clientId,
      channel: c.channel,
      campaignId: c.id,
      recommendation: rec.type,
      change: { op: "rotate_creatives" },
      meta: { generatedAt: new Date().toISOString(), dryRun: true, source: "ui-demo" },
    };
  }
  return null;
}



function computeDerived(c: Campaign, s: DemoSettings = DEFAULT_SETTINGS): DerivedCampaign {
  const roas = c.revenue && c.spend ? c.revenue / c.spend : 0;
  const cpa = c.conversions ? c.spend / c.conversions : null;

  let recommendation: Recommendation | null = null;

  // Simple heuristic rules for demo
  if (c.status === "Learning") {
    recommendation = {
      type: "hold",
      title: "Leave As Is: Learning Phase",
      reason: "Campaign is in learning phase. Evaluate no earlier than 72 hours.",
      action: null,
      risk: "Premature changes will reset learning.",
    };
  } else if (roas < s.lowRoasThreshold && c.spend >= s.minSpendForPause && c.impressions > 50_000) {
    recommendation = {
      type: "pause",
      title: "Check/Pause", 
      reason: `High spending (≥ ${s.minSpendForPause}) with ROAS < ${s.lowRoasThreshold}`,
      action: { kind: "pause_campaign" },
      risk: "Possible conversion underreporting (lag).",
    };
  } else if (roas >= s.highRoasThreshold && c.conversions >= s.minConversionsForScale) {
    recommendation = {
      type: "scale",
      title: "+15% to budget",
      reason: `Consistently ROAS ≥ ${s.highRoasThreshold} and conversion volume ≥ ${s.minConversionsForScale}`,
      action: { kind: "increase_budget", by: 0.15 },
      risk: "Monitor stability for 48 hours.",
    };
  } else if (c.channel === "Meta Ads" && c.frequency > s.fatigueFreq && c.ctr < s.lowCtrThreshold) {
    recommendation = {
      type: "creative",
      title: "Change creatives / reduce frequency",
      reason: `High frequency (${c.frequency.toFixed(1)}) and declining CTR (< ${(s.lowCtrThreshold*100).toFixed(1)}%) - signs of ad fatigue`,
      action: { kind: "rotate_creatives" },
      risk: "Short-term performance drop during testing.",
    };
  }

  return { ...c, roas, cpa, recommendation };
}

// --- UI components ----------------------------------------------------------
function KpiCard({ label, value, hint }: { label: string, value: string, hint?: string }) {
  return (
    <div className="rounded-2xl shadow p-4 bg-white flex flex-col gap-1">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {hint ? <div className="text-xs text-gray-400">{hint}</div> : null}
    </div>
  );
}

function Badge({ children, tone = "gray" }: { children: React.ReactNode; tone?: Tone }) {
  const map: Record<Tone, string> = {
    gray: "bg-gray-100 text-gray-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs ${map[tone]}`}>{children}</span>
  );
}

function RecommendationPill({ rec }: { rec: Recommendation | null }) {
  if (!rec) return <Badge tone="gray">No recommendations</Badge>;
  const tone =
    rec.type === "scale"
      ? "green"
      : rec.type === "pause"
      ? "red"
      : rec.type === "creative"
      ? "amber"
      : "blue";
  return <Badge tone={tone}>{rec.title}</Badge>;
}

function SkeletonRow() {
  return (
    <tr className="border-t animate-pulse">
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} className="p-3">
          <div className="h-4 w-full bg-gray-100 rounded" />
        </td>
      ))}
    </tr>
  );
}


function DashboardInner() {
    const router = useRouter();
    const searchParams = useSearchParams();


    const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
    const [channelFilter, setChannelFilter] = useState<"All" | Channel>(
    (searchParams.get("channel") as Channel) ?? "All"
    );
    const [sortBy, setSortBy] = useState<"spend" | "revenue" | "roas" | "cpa" | "ctr" | null>(
    (searchParams.get("sort") as ("spend" | "revenue" | "roas" | "cpa" | "ctr")) ?? null
    );
    const [sortDir, setSortDir] = useState<"asc" | "desc">(
    (searchParams.get("dir") as "asc" | "desc") ?? "desc"
    );
    const [selected, setSelected] = useState<DerivedCampaign | null>(null);
    const [audit, setAudit] = useState<AuditEntry[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [settings, setSettings] = useState<DemoSettings>(() => {
      if (typeof window === "undefined") return DEFAULT_SETTINGS;
      try {
        const raw = localStorage.getItem("adpilot_demo_settings");
        return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
      } catch {
        return DEFAULT_SETTINGS;
      }
    });
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [rawCampaigns, setRawCampaigns] = useState<Campaign[]>([]);
    const [clientId, setClientId] = useState<ClientId>(() => {
      const v = (searchParams.get("client") as ClientId) ?? "acme";
      return (["acme","orbit","nova","zen"] as const).includes(v) ? v : "acme";
    });
    const [readOnly, setReadOnly] = useState<boolean>(() => (searchParams.get("mode") === "ro"));
    const [actionJson, setActionJson] = useState<string | null>(null);
    const [payloadOpen, setPayloadOpen] = useState(false);




    useEffect(() => {
      let alive = true;
      (async () => {
        setRefreshing(true);
        setErrorMsg(null);
        try {
          const data = await getCampaigns({
            clientId,
            channel: channelFilter === "All" ? undefined : channelFilter,
            q: query || undefined,
          });
          if (alive) setRawCampaigns(data);
        } catch (e) {
          if (alive) setErrorMsg(`Failed to load campaigns (demo API). ${e}`);
        } finally {
          if (alive) setRefreshing(false);
        }
      })();
      return () => { alive = false; };
    }, [ clientId, channelFilter, query ]);

    useEffect(() => {
      try {
        localStorage.setItem("adpilot_demo_settings", JSON.stringify(settings));
      } catch {}
    }, [settings]);


    const urlState = useMemo(() => ({
      client: clientId || null,
      q: query || null,
      channel: channelFilter === "All" ? null : channelFilter,
      sort: sortBy || null,
      dir: sortBy ? sortDir : null,
      mode: readOnly ? "ro" : null,
    }), [clientId, query, channelFilter, sortBy, sortDir, readOnly]);


    useEffect(() => {
      const params = new URLSearchParams();
      Object.entries(urlState).forEach(([k, v]) => {
          if (v != null && v !== "") params.set(k, v);
      });
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "");
    }, [urlState, router]);


    function onChannelClick(ch: "All" | Channel) {
      if (channelFilter === ch) setChannelFilter("All");
      else setChannelFilter(ch);
    }

    function toggleSort(col: "spend" | "revenue" | "roas" | "cpa" | "ctr") {
        if (sortBy === col) {
            if (sortDir === "asc") {
            // third click
            setSortBy(null);
            setSortDir("desc");
            } else {
            // second click
            setSortDir("asc");
            }
        } else {
            // first click
            setSortBy(col);
            setSortDir("desc");
        }
    }



  const data = useMemo<DerivedCampaign[]>(
    () => rawCampaigns.map((c) => computeDerived(c, settings)),
    [rawCampaigns, settings]
  );

  const filtered = useMemo(
    () => data.filter(c => (channelFilter === "All" || c.channel === channelFilter) &&
                          (!query || c.name.toLowerCase().includes(query.toLowerCase()))),
    [ data, channelFilter, query ]
  );

  const sorted = useMemo<DerivedCampaign[]>(() => {
    const arr = [...filtered];
    if (!sortBy) return arr;
    arr.sort((a, b) => {
      const av =
        sortBy === "roas" ? a.roas :
        sortBy === "cpa" ? (a.cpa ?? Number.POSITIVE_INFINITY) :
        sortBy === "ctr" ? a.ctr :
        sortBy === "spend" ? a.spend : a.revenue;
      const bv =
        sortBy === "roas" ? b.roas :
        sortBy === "cpa" ? (b.cpa ?? Number.POSITIVE_INFINITY) :
        sortBy === "ctr" ? b.ctr :
        sortBy === "spend" ? b.spend : b.revenue;
      if (av === bv) return 0;
      return sortDir === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return arr;
  }, [filtered, sortBy, sortDir]);


  const totals = useMemo(() => {
    const base = { spend: 0, revenue: 0, conversions: 0, clicks: 0 };
    const agg = filtered.reduce((acc, c) => {
      acc.spend += c.spend;
      acc.revenue += c.revenue;
      acc.conversions += c.conversions;
      acc.clicks += c.clicks;
      return acc;
    }, base);
    return {
      spend: `€${agg.spend.toFixed(2)}`,
      revenue: `€${agg.revenue.toFixed(2)}`,
      roas: agg.spend ? (agg.revenue / agg.spend).toFixed(2) : "0.00",
      cpa: agg.conversions ? `€${(agg.spend / agg.conversions).toFixed(2)}` : "—",
      ctr: agg.clicks && filtered.length
        ? `${(
            (filtered.reduce((a, c) => a + c.ctr, 0) / filtered.length) * 100
          ).toFixed(2)}%`
        : "—",
    };
  }, [filtered]);

  function buildReadonlyLink(): string {
    const params = new URLSearchParams();
    if (clientId) params.set("client", clientId);
    if (query) params.set("q", query);
    if (channelFilter !== "All") params.set("channel", channelFilter);
    if (sortBy) {
      params.set("sort", sortBy);
      params.set("dir", sortDir);
    }
    params.set("mode", "ro");
    const qs = params.toString();
    return `${window.location.origin}${window.location.pathname}${qs ? `?${qs}` : ""}`;
  }


  function onGenerateAction(c: DerivedCampaign) {
    const rec = c.recommendation;
    const entry: AuditEntry = {
      ts: new Date().toISOString(),
      campaign: c.name,
      channel: c.channel,
      action: rec?.action ? (rec.action as Exclude<RecAction, null>).kind : "none",
      title: rec?.title || "no-op",
    };
    setAudit((prev) => [entry, ...prev]);

    const payload = buildActionPayload(c, clientId);
    setActionJson(payload ? JSON.stringify(payload, null, 2) : null);

    setSelected(c);
  }

  async function onRefresh() {
    setRefreshing(true);
    setErrorMsg(null);
    try {
      const data = await getCampaigns({
        channel: channelFilter === "All" ? undefined : channelFilter,
        q: query || undefined,
      });
      setRawCampaigns(data);
    } catch {
      setErrorMsg("Failed to update yesterday&apos;s data: API quota exceeded. Please try again later.")
    } finally {
      setRefreshing(false);
    }
  }

  function toCsv(rows: DerivedCampaign[]) {
    const headers = ["Channel","Campaign","Status","Spend","Revenue","ROAS","CPA","CTR"];
    const lines = rows.map((c) => [
      c.channel, c.name, c.status,
      c.spend.toFixed(2), c.revenue.toFixed(2),
      c.roas.toFixed(2), c.cpa ? c.cpa.toFixed(2) : "",
      (c.ctr * 100).toFixed(2) + "%"
    ]);
    const csv = [headers, ...lines]
      .map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(","))
      .join("\n");
    return csv;
  }


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

    function onExportCsv() {
    const csv = toCsv(sorted);
    download(`adpilot_campaigns_${new Date().toISOString().slice(0,10)}.csv`, csv);
    }


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-2xl bg-black text-white grid place-items-center font-bold">A</div>
            <div className="font-semibold">AdPilot</div>
            <Badge tone="blue">Mock / without API</Badge>
            {readOnly && <Badge tone="amber">Read-only</Badge>}
          </div>
          <div className="flex items-center gap-2">
            {!readOnly && (
              <>
              <button className="px-3 py-1.5 rounded-xl bg-gray-900 text-white text-sm" onClick={onRefresh}>
                {refreshing ? "Updating…" : "Refresh data"}
              </button>
              <button className="px-3 py-1.5 rounded-xl border text-sm" onClick={onExportCsv}>
                  Export CSV
              </button>
              <button
                className="px-3 py-1.5 rounded-xl border text-sm"
                onClick={() => setSettingsOpen(true)}
                aria-label="Open demo settings"
              >
                ⚙️
              </button>
              <button
                className="px-3 py-1.5 rounded-xl border text-sm"
                onClick={() => {
                  const link = buildReadonlyLink();
                  navigator.clipboard.writeText(link).catch(() => {});
                }}
                title="Copy read-only link"
              >
                Share (read-only)
              </button>
              </>
            )}
            <select
              className="px-3 py-1.5 rounded-xl border text-sm"
              value={clientId}
              onChange={(e) => setClientId(e.target.value as ClientId)}
              aria-label="Select client"
            >
              {CLIENTS.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {errorMsg && (
            <div className="bg-red-50 border-t border-red-200">
                <div className="max-w-6xl mx-auto px-4 py-2 text-sm text-red-700 flex items-center justify-between">
                <span>{errorMsg}</span>
                <button className="underline" onClick={() => setErrorMsg(null)}>Hide</button>
                </div>
            </div>
        )}
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Connections */}
        <section className="grid md:grid-cols-3 gap-3">
          <div className="rounded-2xl border p-4 bg-white flex items-center justify-between">
            <div>
              <div className="font-medium">Google Ads</div>
              <div className="text-xs text-gray-500">Status: connected (mock)</div>
            </div>
            <button className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 text-sm">Manage</button>
          </div>
          <div className="rounded-2xl border p-4 bg-white flex items-center justify-between">
            <div>
              <div className="font-medium">Meta Ads</div>
              <div className="text-xs text-gray-500">Status: connected (mock)</div>
            </div>
            <button className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 text-sm">Manage</button>
          </div>
          <div className="rounded-2xl border p-4 bg-white flex items-center justify-between">
            <div>
              <div className="font-medium">GA4</div>
              <div className="text-xs text-gray-500">Status: connected (mock)</div>
            </div>
            <button className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 text-sm">Manage</button>
          </div>
        </section>

        {/* KPIs */}
        <section className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Spend (30d)" value={totals.spend} />
          <KpiCard label="Revenue (30d)" value={totals.revenue} />
          <KpiCard label="ROAS" value={totals.roas} />
          <KpiCard label="CPA" value={totals.cpa} />
        </section>

        {/* Filters */}
        <section className="rounded-2xl bg-white p-4 border flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            {(["All", "Google Ads", "Meta Ads"] as const).map((ch) => (
              <button
                key={ch}
                onClick={() => onChannelClick(ch)}
                className={`px-3 py-1.5 rounded-full text-sm border ${
                  channelFilter === ch ? "bg-gray-900 text-white" : "bg-white"
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Searching for campaigns…"
              className="px-3 py-2 rounded-xl border w-64"
            />
            <button
              className="px-3 py-2 rounded-xl border text-sm"
              onClick={() => {
                setQuery("");
                setChannelFilter("All");
                setSortBy(null);
                setSortDir("desc");
              }}
              title="Reset filters and sort"
            >
              Reset
            </button>
          </div>
        </section>

        {/* Table */}
        <section className="rounded-2xl overflow-hidden border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Channel</th>
                <th className="text-left p-3">Campaign</th>
                <th className="text-right p-3">
                    <button onClick={() => toggleSort("spend")} className="hover:underline">
                        Spend {sortBy === "spend" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                    </button>
                </th>
                <th className="text-right p-3">
                    <button onClick={() => toggleSort("revenue")} className="hover:underline">
                        Revenue {sortBy === "revenue" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                    </button>
                </th>
                <th className="text-right p-3">
                    <button onClick={() => toggleSort("roas")} className="hover:underline">
                        ROAS {sortBy === "roas" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                    </button>
                </th>
                <th className="text-right p-3">
                    <button onClick={() => toggleSort("cpa")} className="hover:underline">
                        CPA {sortBy === "cpa" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                    </button>
                </th>
                <th className="text-right p-3">
                    <button onClick={() => toggleSort("ctr")} className="hover:underline">
                        CTR {sortBy === "ctr" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                    </button>
                </th>
                <th className="text-left p-3">Recommendation</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
                {refreshing ? (
                    <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                    </>
                ) : sorted.length === 0 ? (
                    <tr>
                    <td colSpan={9} className="p-6 text-center text-sm text-gray-500">
                        No results found for current filters. Reset filters or modify your search.
                    </td>
                    </tr>
                ) : (
                    sorted.map((c) => (
                    <tr key={c.id} className="border-t">
                        <td className="p-3 whitespace-nowrap">{c.channel}</td>
                        <td className="p-3">
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-gray-500">{c.status}</div>
                        </td>
                        <td className="p-3 text-right">€{c.spend.toFixed(2)}</td>
                        <td className="p-3 text-right">€{c.revenue.toFixed(2)}</td>
                        <td className="p-3 text-right">{c.roas.toFixed(2)}</td>
                        <td className="p-3 text-right">{c.cpa ? `€${c.cpa.toFixed(2)}` : "—"}</td>
                        <td className="p-3 text-right">{(c.ctr * 100).toFixed(2)}%</td>
                        <td className="p-3"><RecommendationPill rec={c.recommendation} /></td>
                        <td className="p-3 text-right">
                        <div className="flex justify-end gap-2">
                            <button onClick={() => { 
                                  setSelected(c); setActionJson(buildActionPayload(c, clientId) ? JSON.stringify(buildActionPayload(c, clientId), null, 2) : null); 
                                }}
                                className="px-3 py-1.5 rounded-xl border"
                            >
                            More
                            </button>
                            {!readOnly && (
                              <button onClick={() => onGenerateAction(c)} className="px-3 py-1.5 rounded-xl bg-gray-900 text-white">
                              Generate action
                              </button>
                            )}
                        </div>
                        </td>
                    </tr>
                    ))
                )}
                </tbody>
          </table>
        </section>

        {/* Audit log */}
        {!readOnly && (
        <section className="rounded-2xl border bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">Activity Journal (local, mock)</div>
            <button
              className="text-sm text-gray-500 underline"
              onClick={() => setAudit([])}
            >
              Clear
            </button>
          </div>
          {audit.length === 0 ? (
            <div className="text-sm text-gray-500">No actions yet. Use &apos;Generate Action&apos; for a campaign.</div>
          ) : (
            <ul className="space-y-2">
              {audit.map((a, idx) => (
                <li key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge tone="blue">{a.action}</Badge>
                    <span className="font-medium">{a.campaign}</span>
                    <span className="text-gray-500">({a.channel})</span>
                  </div>
                  <div className="text-gray-400">{new Date(a.ts).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
        )}
      </main>

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center p-4" onClick={() => setSelected(null)}>
          <div
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-gray-500">{selected.channel}</div>
                <div className="text-xl font-semibold">{selected.name}</div>
              </div>
              <button className="text-gray-400" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 rounded-lg bg-gray-50">
                  <div className="text-gray-500">Spend</div>
                  <div className="font-medium">€{selected.spend.toFixed(2)}</div>
                </div>
                <div className="p-2 rounded-lg bg-gray-50">
                  <div className="text-gray-500">Revenue</div>
                  <div className="font-medium">€{selected.revenue.toFixed(2)}</div>
                </div>
                <div className="p-2 rounded-lg bg-gray-50">
                  <div className="text-gray-500">ROAS</div>
                  <div className="font-medium">{selected.roas.toFixed(2)}</div>
                </div>
                <div className="p-2 rounded-lg bg-gray-50">
                  <div className="text-gray-500">CPA</div>
                  <div className="font-medium">{selected.cpa ? `€${selected.cpa.toFixed(2)}` : "—"}</div>
                </div>
              </div>

              <div className="text-sm">
                <div className="text-gray-500 mb-1">Notes</div>
                <ul className="list-disc ml-5 space-y-1">
                  {selected.notes?.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </div>

              <div className="text-sm">
                <div className="text-gray-500 mb-1">Recommendation</div>
                {selected.recommendation ? (
                  <div className="space-y-1">
                    <RecommendationPill rec={selected.recommendation} />
                    <div className="">{selected.recommendation.reason}</div>
                    {selected.recommendation.risk && (
                      <div className="text-amber-700 text-xs">Potential risk: {selected.recommendation.risk}</div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500">No current recommendations</div>
                )}
              </div>
              {/* Payload (draft) */}
              <div className="text-sm">
                <div className="text-gray-500 mb-1">Payload (draft)</div>
                {actionJson ? (
                  <div className="rounded-lg border bg-gray-50 p-2">
                    <pre className="text-xs overflow-auto max-h-64 leading-5">{actionJson}</pre>
                    <div className="mt-2 flex items-center justify-end gap-2">
                      <button
                        className="px-3 py-1.5 rounded-xl border text-xs"
                        onClick={() => navigator.clipboard.writeText(actionJson).catch(() => {})}
                      >
                        Copy JSON
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500">No changes to generate.</div>
                )}
                <div className="text-xs text-amber-700 mt-1">
                  This is a demo draft. In real mode, it will be sent to the backend as a dry-run before applying.
                </div>
              </div>

            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button className="px-3 py-2 rounded-xl border" onClick={() => setSelected(null)}>
                Close
              </button>
              <button
                className="px-3 py-2 rounded-xl bg-gray-900 text-white"
                onClick={() => setSelected(null)}
              >
                Apply recommendation
              </button>
            </div>
          </div>
        </div>
      )}
      {settingsOpen && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center p-4" onClick={() => setSettingsOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div className="text-xl font-semibold">Demo settings</div>
              <button className="text-gray-400" onClick={() => setSettingsOpen(false)}>✕</button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <label className="flex flex-col gap-1">
                <span className="text-gray-600">Min. spend for «pause», $</span>
                <input
                  type="number"
                  className="px-3 py-2 rounded-xl border"
                  value={settings.minSpendForPause}
                  onChange={(e) => setSettings(s => ({ ...s, minSpendForPause: Number(e.target.value) }))}
                  min={0}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-gray-600">Low ROAS Threshold</span>
                <input
                  type="number" step="0.1"
                  className="px-3 py-2 rounded-xl border"
                  value={settings.lowRoasThreshold}
                  onChange={(e) => setSettings(s => ({ ...s, lowRoasThreshold: Number(e.target.value) }))}
                  min={0}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-gray-600">High ROAS Threshold</span>
                <input
                  type="number" step="0.1"
                  className="px-3 py-2 rounded-xl border"
                  value={settings.highRoasThreshold}
                  onChange={(e) => setSettings(s => ({ ...s, highRoasThreshold: Number(e.target.value) }))}
                  min={0}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-gray-600">Min. conversions for «scale»</span>
                <input
                  type="number"
                  className="px-3 py-2 rounded-xl border"
                  value={settings.minConversionsForScale}
                  onChange={(e) => setSettings(s => ({ ...s, minConversionsForScale: Number(e.target.value) }))}
                  min={0}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-gray-600">Fatigue Frequency (Meta)</span>
                <input
                  type="number" step="0.1"
                  className="px-3 py-2 rounded-xl border"
                  value={settings.fatigueFreq}
                  onChange={(e) => setSettings(s => ({ ...s, fatigueFreq: Number(e.target.value) }))}
                  min={0}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-gray-600">Low CTR Threshold (ratio)</span>
                <input
                  type="number" step="0.001"
                  className="px-3 py-2 rounded-xl border"
                  value={settings.lowCtrThreshold}
                  onChange={(e) => setSettings(s => ({ ...s, lowCtrThreshold: Number(e.target.value) }))}
                  min={0} max={1}
                />
              </label>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <button
                className="text-sm text-gray-500 underline"
                onClick={() => setSettings(DEFAULT_SETTINGS)}
              >
                Reset to default values
              </button>
              <div className="flex items-center gap-2">
                <button className="px-3 py-2 rounded-xl border" onClick={() => setSettingsOpen(false)}>Close</button>
                <button
                  className="px-3 py-2 rounded-xl bg-gray-900 text-white"
                  onClick={() => setSettingsOpen(false)}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <DashboardInner />
    </Suspense>
  );
}
