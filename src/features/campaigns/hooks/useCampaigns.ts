"use client";
import { useEffect, useState } from "react";
import { getCampaigns } from "../api";
import type { CampaignRow, CampaignStatus, Channel, FetchFilters } from "../../../lib/types";
import { fmt, addDays, isValidYmd } from "../../../lib/dates";
import type { CampaignListItem, KpiChip } from "@/lib/contracts/campaigns";

// type RangeKey = "today" | "d7" | "d30";

// выбираем диапазон по умолчанию (можно прокидывать параметром из фильтров)
const pickRange = (c: CampaignListItem): KpiChip | undefined =>
  c.d7 ?? c.today ?? c.d30;

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

    // если у вас в CampaignRow есть ещё поля — скопируйте/синтезируйте тут
    notes: undefined,
    recommendation: undefined, // будет подменяться позже UI-адаптером (UiRec)
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
    setLoading(true); setError(null);
      setRefreshing(true);
      try {
        const data = await getCampaigns({
          ...baseFilters,
          dateFrom: isValidYmd(dateFrom) ? dateFrom : undefined,
          dateTo:   isValidYmd(dateTo)   ? dateTo   : undefined,
        });

        const rows = (data.items ?? []).map(toRow);
        
        if (refreshing) setCampaigns(rows);
      } catch (e: unknown) { 
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err?.message || "Failed to load");
      } finally {
        if (refreshing) setRefreshing(false);
        setLoading(false);
      }
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
