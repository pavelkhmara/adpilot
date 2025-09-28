import React from 'react'

export default function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl shadow p-4 bg-white dark:bg-gray-800 flex flex-col gap-1">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {hint ? <div className="text-xs text-gray-400">{hint}</div> : null}
    </div>
  );
}
