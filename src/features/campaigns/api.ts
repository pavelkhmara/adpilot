import type { FetchFilters, CampaignRow } from "../../lib/types";

export async function getCampaigns(filters: FetchFilters = {}): Promise<CampaignRow[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  });
  const url = `/api/campaigns${params.toString() ? `?${params}` : ""}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    let msg = "Failed to fetch campaigns";
    try { const data = await res.json(); if (data?.detail) msg += `: ${data.detail}`; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export async function importCsv(client: string, file: File) {
  const fd = new FormData(); 
  fd.set("client", client);
  fd.set("file", file);
  const res = await fetch("/api/import", { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Import failed");
  return data as { ok: true; campaignsCreated: number; metricRowsUpserted: number };
}

// // from adpilot.ts
// export async function getCampaigns(filters: FetchFilters = {}) {
//   const params = new URLSearchParams();
//   if (filters.clientId) params.set("client", filters.clientId);
//   if (filters.channel) params.set("channel", filters.channel);
//   if (filters.q) params.set("q", filters.q);
//   if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
//   if (filters.dateTo) params.set("dateTo", filters.dateTo);

//   if (filters.lowRoas) params.set("lowRoas", String(filters.lowRoas));
//   if (filters.highRoas) params.set("highRoas", String(filters.highRoas));
//   if (filters.minSpendForPause) params.set("minSpendForPause", String(filters.minSpendForPause));
//   if (filters.minConversionsForScale) params.set("minConvForScale", String(filters.minConversionsForScale));
//   if (filters.fatigueFreq) params.set("fatigueFreq", String(filters.fatigueFreq));
//   if (filters.lowCtr) params.set("lowCtr", String(filters.lowCtr));

//   const url = `/api/campaigns${params.toString() ? `?${params.toString()}` : ""}`;
//   const res = await fetch(url, { cache: "no-store" });
//   if (!res.ok) {
//     let msg = "Failed to fetch campaigns";
//     try {
//       const data = await res.json();
//       if (data?.detail) msg += `: ${data.detail}`;
//     } catch {}
//     throw new Error(msg);
//   }
//   return res.json();
// }
