
import { RecType } from '../../lib/types';
import React from 'react'

export default function RecBadge({ type, text }: { type: RecType; text: string }) {
  const cls =
    type === "pause"
      ? "bg-red-100 text-red-700"
      : type === "scale"
      ? "bg-green-100 text-green-700"
      : type === "creative"
      ? "bg-amber-100 text-amber-700"
      : "bg-gray-100 text-gray-600";
  return <span className={`px-2 py-0.5 rounded-full text-xs ${cls}`}>{text}</span>;
}
