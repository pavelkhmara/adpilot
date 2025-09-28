import { Trend } from '@/lib/types';
import React from 'react'

export default function Kpi({ label, value, trend, inverse }: { label: string; value: string; trend?: Trend; inverse?: boolean }) {
  const glyph = trend === "up" ? "▲" : trend === "down" ? "▼" : "•";
  const color =
    trend === "flat" || trend == null
      ? "text-gray-400"
      : trend === "up"
      ? inverse ? "text-emerald-600" : "text-red-600"
      : inverse ? "text-red-600" : "text-emerald-600";

  return (
    <div className="p-2 rounded-lg border border-gray-100 bg-gray-50 dark:bg-gray-800">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <div className="font-medium tabular-nums">{value}</div>
        {trend && <div className={`text-xs ${color}`}>{glyph}</div>}
      </div>
    </div>
  );
}
