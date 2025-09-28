import React from 'react'
import Badge from '../UI/Badge'
import { Channel } from '@/lib/types';

export type ActionEntry = {
  ts: string;
  campaign: string;
  channel: Channel;
  action: string;
  title: string;
}

export default function ActionsLog({ entries, onClear, }: { entries: ActionEntry[]; onClear: () => void; }) {

  return (
    <section className="rounded-2xl border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-2">
            <div className="font-medium">Activity Journal (local, demo)</div>
            <button className="text-sm text-gray-500 underline" onClick={onClear}>
            Clear
            </button>
        </div>

        {entries.length === 0 ? (
            <div className="text-sm text-gray-500">
            No actions yet. Use &apos;Generate Action&apos; for a campaign.
            </div>
        ) : (
            <ul className="space-y-2">
            {entries.map((a, idx) => (
                <li key={idx} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                    <Badge tone="blue">{a.action}</Badge>
                    <span className="font-medium">{a.campaign}</span>
                    <span className="text-gray-500">({a.channel})</span>
                    <span className="text-gray-600">— {a.title}</span>
                </div>
                <div className="text-gray-400">
                    {new Date(a.ts).toLocaleString()}
                </div>
                </li>
            ))}
            </ul>
        )}
    </section>
  )
}
