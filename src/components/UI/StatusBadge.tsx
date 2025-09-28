import React from 'react'
import { CampaignModalData } from '../dashboard/CampaignModal';

export default function StatusBadge({ status }: { status: CampaignModalData["status"] }) {
  const map: Record<string, string> = {
    Active: "bg-emerald-100 text-emerald-700",
    Learning: "bg-blue-100 text-blue-700",
    Paused: "bg-gray-200 text-gray-700",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs ${map[status]}`}>{status}</span>;
}