"use client";
import { useEffect, useState } from "react";
import { getCampaigns } from "../api";
import type { CampaignRow, CampaignStatus, Channel, FetchFilters } from "../../../lib/types";
import { fmt, addDays, isValidYmd } from "../../../lib/dates";
import type { CampaignListResponse, CampaignListItem, KpiChip } from "../../../lib/contracts/campaigns";

// type RangeKey = "today" | "d7" | "d30";

// 1) choose KPI-chip by rule: d7 -> today -> d30
const pickRange = (c: CampaignListItem): KpiChip | undefined =>
  c.d7 ?? c.today ?? c.d30;

// 2) contract conversion -> CampaignRow (flat table row)
const toRow = (c: CampaignListItem): CampaignRow => {
  const k = pickRange(c);
  const impressions = k?.impressions ?? 0;
  const clicks = k?.clicks ?? 0;
  const spend = k?.spend ?? 0;
  const revenue = k?.revenue ?? 0;
  const conversions = k?.conv ?? 0;

  // Calculated values
  const ctr = impressions > 0 ? clicks / impressions : 0;
  const roas = spend > 0 ? revenue / spend : 0;
  const cpc = clicks > 0 ? spend / clicks : undefined;

  return {
    id: c.id,
    name: c.name,
    channel: c.channel as Channel,
    status: c.status as CampaignStatus,

    impressions,
    clicks,
    spend,
    conversions,
    revenue,

    ctr,
    cpc,
    roas,
    frequency: 0, 

    notes: undefined,
    recommendation: undefined,
    pacing: c.pacing ?? undefined,
  };
};


export function useCampaigns(baseFilters: Omit<FetchFilters,"dateFrom"|"dateTo">) {
  const today = new Date(); const defaultFrom = addDays(today, -29);
  const [dateFrom, setDateFrom] = useState<string>(fmt(defaultFrom));
  const [dateTo, setDateTo] = useState<string>(fmt(today));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

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

        const rows = (data.items ?? []).map(toRow);
        
        if (alive) setCampaigns(rows);
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
