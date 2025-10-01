"use client";
import RecBadge from "../../../components/UI/RecBadge";
import StatusBadge from "../../../components/UI/StatusBadge";
import { Trend, Channel, Rec } from "../../../lib/types";
import React, { useEffect, useMemo, useState } from "react";
import Kpi from "../Kpi";
import { fmtInt, fmtMoney, safeStringify } from "../../../lib/utils";
import Collapsible from "../../../components/UI/Collapsible";
import Badge from "../../../components/UI/Badge";
import { BarChart, Bar, Rectangle, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useRecommendations } from "@/features/campaigns/hooks/fetchRecommendations";
import { toUiRec, UiRec } from "@/features/campaigns/mapRecToUi";

export type CampaignModalData = {
  id: string;
  channel: Channel;
  name: string;
  status: string;
  // агрегаты периода
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  revenue: number;
  frequency: number; // avg
  ctr: number;       // avg (0..1)

  roasTrend?: Trend;
  cpaTrend?: Trend;
  ctrTrend?: Trend;

  recommendation?: Rec;

  notes?: string[];
  raw?: unknown;
  series?: Array<{ date: string; spend: number; revenue: number; conversions: number; ctr?: number }>;
};

export type CampaignAction =
  | { type: "pause"; id: string }
  | { type: "scale"; id: string; scaleBy: number } // by = 0.1 -> +10%
  | { type: "rotate_creatives"; id: string };




function RecommendationPill({ rec }: { rec: UiRec }) {
  if (!rec) return <Badge tone="gray">No recommendations</Badge>;
  const tone =
    rec.type === "scale"
      ? "green"
      : rec.type === "pause"
      ? "red"
      : rec.type === "creative"
      ? "amber"
      : "blue";
  return <Badge tone={tone}>{rec.reason}</Badge>;
}

const generateMockSeries = (days: number = 7) => {
  const series = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    const spend = Math.random() * 3000 + 2000; // 2000-5000
    const revenue = spend * (Math.random() * 2 + 2); // ROAS 2-4
    const conversions = Math.floor(spend / 15 + Math.random() * 50);
    
    series.push({
      date: date.toISOString().split('T')[0], // YYYY-MM-DD
      spend: Number(spend.toFixed(2)),
      revenue: Number(revenue.toFixed(2)),
      conversions: conversions,
      clicks: Math.floor(spend / 1.2 + Math.random() * 500),
      impressions: Math.floor(spend * 50 + Math.random() * 10000),
      ctr: Number((Math.random() * 0.01 + 0.015).toFixed(4)),
      frequency: Number((Math.random() * 0.5 + 2.0).toFixed(1))
    });
  }
  
  return series;
};

const mockData = {
  series: generateMockSeries(10)
};
type Props = {
  open: boolean; 
  data: CampaignModalData | null; 
  onClose: () => void; 
  onAction: (a: CampaignAction) => void;
  onDismiss: (rec: Rec, reason?: string) => void;
  onSnooze: (rec: Rec, untilISO: string, note?: string) => void;
}
export default function CampaignModal({ open, data, onClose, onAction, onDismiss, onSnooze }: Props) {
  const [jsonOpen, setJsonOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(true);
  const [scaleBy, setScaleBy] = useState(0.15); // default +15%

  const roas = useMemo(() => (data && data.spend > 0 ? data.revenue / data.spend : 0), [data]);
  const cpa = useMemo(() => (data && data.conversions > 0 ? data.spend / data.conversions : 0), [data]);

  const ids = data?.id ? [data.id] : [];
  const { map: singleRecMap } = useRecommendations(ids);
  const recommendation = data?.id ? (singleRecMap[data.id] ?? data.recommendation) : data?.recommendation;
  const rec= toUiRec(recommendation);

  useEffect(() => {
    if (!data?.notes?.length) setNotesOpen(false);
  }, [data?.notes])

  if (!open || !data) return null;

  return (
    <div className="fixed inset-0 grid place-items-center bg-black/40 p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 mt-10 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Campaign details"
      >
        {/* header */}
        <div className="px-5 py-4 border-b border-gray-400 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs text-gray-500">{data.channel}</div>
            <div className="text-lg font-semibold truncate" title={data.name}>{data.name}</div>
            <div className="mt-1 flex items-center gap-2 text-xs">
              <StatusBadge status={data.status} />
              {/* {data.recommendation && <RecBadge type={data.recommendation.type} text={data.recommendation.title} />} */}
              {rec && <RecBadge type={rec.type} text={rec.title} />}
            </div>
          </div>
          <button className="text-gray-400 hover:text-gray-600" aria-label="Close" onClick={onClose}>✕</button>
        </div>

        {/* content (scrollable) */}
        <div className="px-5 py-4 overflow-auto space-y-4" style={{ maxHeight: "calc(85vh - 64px - 64px)" }}>
          {/* KPIs */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="Spend" value={fmtMoney(data.spend)} />
            <Kpi label="Revenue" value={fmtMoney(data.revenue)} />
            <Kpi label="ROAS" value={roas.toFixed(2)} trend={data.roasTrend} />
            <Kpi label="CPA" value={cpa.toFixed(2)} trend={data.cpaTrend} inverse />
            <Kpi label="CTR" value={`${(data.ctr * 100).toFixed(2)}%`} trend={data.ctrTrend} />
            <Kpi label="Freq" value={data.frequency.toFixed(2)} />
            <Kpi label="Clicks" value={fmtInt(data.clicks)} />
            <Kpi label="Conv." value={fmtInt(data.conversions)} />
          </section>

          {/* <div className="text-sm">
            <div className="text-gray-500 mb-1">Recommendation</div>
            {data.recommendation ? (
              <div className="space-y-1">
                <RecommendationPill rec={data.recommendation} />
                {data.recommendation?.reason && (
                  <div className="mt-2 text-xs text-gray-500">
                    Reason: {data.recommendation.reason}
                  </div>
                )}
                {data.recommendation.risk && (
                  <div className="text-amber-700 text-xs">Potential risk: {data.recommendation.risk}</div>
                )}
              </div>
            ) : (
              <div className="text-gray-500">No current recommendations</div>
            )}
          </div> */}
          <div className="text-sm">
            <div className="text-gray-500 mb-1">Recommendation {rec?.status && <RecBadge type={rec.type} text={rec.status} />}</div>
            {rec ? (
              <div className="space-y-1">
                <RecommendationPill rec={rec} />
                {rec?.reason && (
                  <div className="mt-2 text-xs text-gray-500">
                    Reason: {rec.reason}
                  </div>
                )}
                {/* {rec?.risk && (
                  <div className="text-amber-700 text-xs">Potential risk: {rec?.risk}</div>
                )} */}
              </div>
            ) : (
              <div className="text-gray-500">No current recommendations</div>
            )}
          </div>

          {/* Notes (collapsible) */}
          <Collapsible
            title={`Notes (${data.notes?.length ?? 0})`}
            open={notesOpen}
            onToggle={() => setNotesOpen(v => !v)}
          >
            {data.notes && data.notes.length > 0 ? (
              <ul className="list-disc pl-5 text-sm space-y-1">
                {data.notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            ) : (
              <div className="text-sm text-gray-500">No notes</div>
            )}
          </Collapsible>

          {/* Raw JSON (collapsible) */}
          <Collapsible
            title="Raw JSON"
            open={jsonOpen}
            onToggle={() => setJsonOpen(v => !v)}
          >
            <pre className="text-xs bg-[rgb(var(--muted))] rounded-xl p-3 overflow-auto max-h-64">
              {safeStringify(data.raw ?? data, 2)}
            </pre>
          </Collapsible>

          {/* (Опционально) мини-серия — можно подключить позже график */}
          {/* {data.series && data.series.length > 0 && ( */}
            <section className="panel p-3 ">
              {/* <div className="text-sm font-medium mb-2">Last days</div> */}
              {/* <div className="text-xs text-gray-500">Chart can be added later; currently showing 3 rows:</div> */}
              {/* <div className="text-sm font-medium mb-2">Performance Trend</div> */}
  
              {/* Chart */}
              <div className="mb-4 w-fit h-full">
                <ResponsiveContainer width="100%" height="100%" minWidth="calc(30vw - 100px)" minHeight="calc(20vh - 30px)">
                  <BarChart
                    width={300}
                    height={250}
                    data={mockData.series}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    {/* <XAxis dataKey="date" />
                    <YAxis /> */}
                    <Tooltip />
                    {/* <Legend /> */}
                    <Bar dataKey="spend" fill="#8884d8" activeBar={<Rectangle fill="pink" stroke="blue" />} />
                    <Bar dataKey="revenue" fill="#82ca9d" activeBar={<Rectangle fill="gold" stroke="purple" />} />
                    <Bar dataKey="conversions" fill="#ffc658" activeBar={<Rectangle fill="green" stroke="gray" />} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 text-sm grid gap-1  overflow-auto max-h-40">
                  <li className="flex items-center justify-between gap-2">
                    <span className="text-gray-500">Date</span>
                    <span>Spend </span>
                    <span>Revenue</span>
                    <span>Conv</span>
                  </li>
                {(data.series ? data.series : mockData.series).slice(-7).map((d, i) => (
                  <li key={i} className="flex items-center justify-between gap-2">
                    <span className="text-gray-500 text-xs">{d.date}</span>
                    <span>{fmtMoney(d.spend)}</span>
                    <span>{fmtMoney(d.revenue)}</span>
                    <span>{fmtInt(d.conversions)}</span>
                  </li>
                ))}
              </ul>
            </section>
          {/* )} */}
        </div>

        {/* footer */}
        <div className="px-5 py-3 border-t border-gray-400 border-app flex items-center justify-between gap-2">
          {/* Actions */}
          {data.recommendation && (
            <section className="pb-2">
              <div className="text-xs font-medium mb-1">Actions</div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="px-3 py-1.5 rounded-xl bg-red-200 border border-red-300 hover:bg-red-300"
                  onClick={() => onAction({ type: "pause", id: data.recommendation ? data.recommendation.id : '' })}
                  title="Pause campaign"
                >
                  Pause
                </button>

                <div className="flex items-center gap-2">
                  <select
                    className="px-2 py-2.5 rounded-xl border border-green-300 bg-app text-sm"
                    value={scaleBy}
                    onChange={(e) => setScaleBy(Number(e.target.value))}
                  >
                    {[0.1, 0.15, 0.2, 0.3, 0.5].map(v => (
                      <option key={v} value={v}>+{Math.round(v * 100)}%</option>
                    ))}
                  </select>
                  <button
                    className="px-3 py-1.5 rounded-xl bg-green-200 border border-green-300 hover:bg-green-300"
                    onClick={() => onAction({ type: "scale", id: data.recommendation ? data.recommendation.id : '', scaleBy: scaleBy })}
                    title="Increase budget"
                  >
                    Scale
                  </button>
                </div>

                <button
                  className="px-3 py-1.5 rounded-xl bg-blue-200 border border-blue-300 hover:bg-blue-300"
                  onClick={() => onAction({ type: "rotate_creatives", id: data.recommendation ? data.recommendation.id : '' })}
                  title="Refresh creatives"
                >
                  Rotate creatives
                </button>
              </div>

              
            </section>
          )}
          {rec?.status === 'applied' && data && data?.recommendation && (
            <button className="px-3 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-200" onClick={() => onDismiss(data?.recommendation as Rec)}>Dismiss</button>
          )}
          <button className="px-3 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-200" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

