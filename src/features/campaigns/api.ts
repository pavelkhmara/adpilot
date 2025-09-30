import type { FetchFilters, CampaignListResponse } from "../../lib/types";

export async function getCampaigns(filters: FetchFilters = {}): Promise<CampaignListResponse> {
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
