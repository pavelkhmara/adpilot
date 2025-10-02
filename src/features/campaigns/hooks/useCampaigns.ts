"use client";
import { useEffect, useState } from "react";
import { getCampaigns } from "../api";
import type { CampaignRow, FetchFilters } from "../../../lib/types";
import { fmt, addDays, isValidYmd } from "../../../lib/dates";
import type { CampaignListResponse, CampaignListItem } from "../../../lib/contracts/campaigns";
import { toCampaignRow } from "../adapters/toCampaignRow";



export function useCampaigns(baseFilters: Omit<FetchFilters,"dateFrom"|"dateTo">) {
  const today = new Date(); const defaultFrom = addDays(today, -29);
  const [dateFrom, setDateFrom] = useState<string>(fmt(defaultFrom));
  const [dateTo, setDateTo] = useState<string>(fmt(today));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  // const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

  async function refresh() {
    let alive = true;
    setLoading(true); setError(null);
    setRefreshing(true);
      
      try {
        const data: CampaignListResponse = await getCampaigns("/api/campaigns", {
          filterParams: {
          ...baseFilters,
          dateFrom: isValidYmd(dateFrom) ? dateFrom : undefined,
          dateTo:   isValidYmd(dateTo)   ? dateTo   : undefined,
        },
        });

        const items: CampaignListItem[] = data?.items ?? [];
        const rows = items.map(toCampaignRow);
        
        if (alive) setCampaigns(rows);
        // setGeneratedAt(data?.generatedAt ? new Date(data.generatedAt) : null);
      } catch (e: unknown) { 
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err?.message || "Failed to load");
      } finally {
        if (alive) setRefreshing(false);
        setLoading(false);
      }
      alive = false;
  }

  useEffect(() => {
    refresh();
  }, [dateFrom, dateTo, JSON.stringify(baseFilters)]);

  return {
    campaigns, loading, error,
    dateFrom, dateTo, setDateFrom, setDateTo,
    refresh,
  };
}
