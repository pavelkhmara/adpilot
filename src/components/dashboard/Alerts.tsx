"use client";
import React, { useMemo } from "react";

export type RecType = "pause" | "scale" | "creative" | "none";
export type RowWithRec = {
  id: string;
  name: string;
  channel: "Google Ads" | "Meta Ads";
  spend: number;
  recommendation?: { type: RecType; title: string; reason?: string };
};

export default function Alerts({
  rows,
  onOpen,
  max = 5,
}: {
  rows: RowWithRec[];
  onOpen: (id: string) => void;
  max?: number;
}) {
  const alerts = useMemo(() => {
    const actionable = rows.filter(r => r.recommendation && r.recommendation.type !== "none");
    const weight = (t: RecType) => (t === "pause" ? 0 : t === "scale" ? 1 : t === "creative" ? 2 : 9);
    actionable.sort((a, b) => {
      const ta = a.recommendation!.type, tb = b.recommendation!.type;
      if (ta !== tb) return weight(ta) - weight(tb);
      return b.spend - a.spend;
    });
    return actionable.slice(0, max);
  }, [rows, max]);

  if (alerts.length === 0) return null;

  return (
    <section className="rounded-2xl border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 p-4">
      <div className="text-sm font-medium mb-2">Period Alerts</div>
      <ul className="text-sm space-y-2">
        {alerts.map((a) => (
          <li key={a.id} className="flex items-start gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              a.recommendation!.type === "pause" ? "bg-red-100 text-red-700" :
              a.recommendation!.type === "scale" ? "bg-green-100 text-green-700" :
              "bg-amber-100 text-amber-700"
            }`}>
              {a.recommendation!.title}
            </span>
            <button
              className="text-left text-gray-700 hover:underline"
              onClick={() => onOpen(a.id)}
              title="Open campaign details"
            >
              <span className="text-gray-500">{a.channel}</span> — <strong>{a.name}</strong>
              {a.recommendation?.reason ? <> · {a.recommendation!.reason}</> : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
