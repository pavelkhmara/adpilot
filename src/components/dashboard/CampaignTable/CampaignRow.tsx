"use client";
import { CampaignRow as CampaignRowData, Trend } from "../../../lib/types";
import React from "react";


// export type CampaignRowData = {
//   id: string;
//   channel: Channel;
//   name: string;
//   status: Status;
//   impressions: number;
//   clicks: number;
//   spend: number;
//   conversions: number;
//   revenue: number;
//   frequency: number;
//   ctr: number; 
//   roasTrend?: Trend;
//   cpaTrend?: Trend;
//   ctrTrend?: Trend;
//   recommendation?: {
//     type: RecType;
//     title: string;
//     reason: string;
//   };
// };

export function CampaignRow({ row, onOpen, onGenerateAction }: {row: CampaignRowData; onOpen: (row: CampaignRowData) => void; onGenerateAction?: (row: CampaignRowData) => void;}) {
  const roas = row.spend > 0 ? row.revenue / row.spend : 0;
  const cpa = row.conversions > 0 ? row.spend / row.conversions : 0;

  return (
    <tr className="border-t border-app hover:bg-[rgb(var(--muted))]/50">
      <td className="text-left p-3 py-1.5 whitespace-nowrap">{row.channel}</td>

      <td className="text-left p-3 py-1.5">
        <button
          className="font-medium hover:underline"
          onClick={() => onOpen(row)}
          title="Open campaign details"
        >
          {row.name}
        </button>
      </td>

      <td className="text-right p-3 py-1.5 tabular-nums">{row.spend.toFixed(2)}</td>
      <td className="text-right p-3 py-1.5 tabular-nums">{row.revenue.toFixed(2)}</td>

      <td className="text-right p-3 py-1.5">
        <TrendValue value={roas} trend={row.roasTrend} fmt={(v) => v.toFixed(2)} />
      </td>

      <td className="text-right p-3 py-1.5">
        <TrendValue value={cpa} trend={row.cpaTrend} fmt={(v) => v.toFixed(2)} inverse />
      </td>

      <td className="text-right p-3 py-1.5">
        <TrendValue value={row.ctr * 100} trend={row.ctrTrend} fmt={(v) => `${v.toFixed(2)}%`} />
      </td>

      <td className="text-right p-3 py-1.5 tabular-nums">{row.frequency.toFixed(2)}</td>

      <td className="text-left p-3 py-1.5">
        {row.recommendation ? (
          <div className="flex items-center gap-2">
            <RecBadge
              type={row.recommendation.type}
              text={
                ("title" in row.recommendation)
                  ? (row.recommendation.reason || row.recommendation.title)
                  : (row.recommendation.reason ?? "")
              }
            />
            {row.recommendation.status && (
              <RecBadge type="status" text={row.recommendation.status} />
            )}
          </div>
        ) : "—"}

      </td>

      <td className="text-right p-3 py-1.5 flex justify-end gap-2">
        <button className="px-2 py-1 rounded border text-xs" onClick={() => onOpen(row)}>
          Details
        </button>
        {onGenerateAction && (
          <button
            className="px-2 py-1 rounded border text-xs"
            onClick={() => onGenerateAction(row)}
            title="Generate action (demo)"
          >
            Generate Action
          </button>
        )}
      </td>
    </tr>
  );
}

function TrendValue({
  value,
  trend,
  fmt,
  inverse = false,
}: {
  value: number;
  trend?: Trend;
  fmt: (v: number) => string;
  inverse?: boolean;
}) {
  const icon =
    trend === "up" ? "▲" : trend === "down" ? "▼" : "•";
  const color =
    trend === "flat"
      ? "text-gray-400"
      : trend === "up"
      ? inverse ? "text-emerald-600" : "text-red-600"
      : inverse ? "text-red-600" : "text-emerald-600";

  return (
    <span className="inline-flex items-center justify-end gap-1">
      <span className="tabular-nums">{fmt(value)}</span>
      <span className={`text-xs ${color}`}>{icon}</span>
    </span>
  );
}

function RecBadge({ type, text }: { type: string; text: string }) {
  const cls =
    type === "pause"
      ? "bg-red-100 text-red-700"
      : type === "scale"
      ? "bg-green-100 text-green-700"
      : type === "creative"
      ? "bg-amber-100 text-amber-700"
      : "bg-gray-100 text-gray-600";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs ${cls}`}>
      {text}
    </span>
  );
}

export default CampaignRow;
