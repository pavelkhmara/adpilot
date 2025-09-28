"use client";
import { useEffect, useState } from "react";
import { getCampaigns } from "../api";
import type { CampaignRow, FetchFilters } from "../../../lib/types";
import { fmt, addDays, isValidYmd } from "../../../lib/dates";

export function useCampaigns(baseFilters: Omit<FetchFilters,"dateFrom"|"dateTo">) {
  const today = new Date(); const defaultFrom = addDays(today, -29);
  const [dateFrom, setDateFrom] = useState<string>(fmt(defaultFrom));
  const [dateTo, setDateTo] = useState<string>(fmt(today));
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true); setError(null);
    try {
      const data = await getCampaigns({
        ...baseFilters,
        dateFrom: isValidYmd(dateFrom) ? dateFrom : undefined,
        dateTo:   isValidYmd(dateTo)   ? dateTo   : undefined,
      });
      setRows(data);
    } catch (e: unknown) { 
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err?.message || "Failed to load");
    }
    finally { setLoading(false); }
  }

  useEffect(() => {
    refresh();
  }, [dateFrom, dateTo, JSON.stringify(baseFilters)]);

  return {
    rows, loading, error,
    dateFrom, dateTo, setDateFrom, setDateTo,
    refresh,
  };
}
