import { useMemo } from "react";
import { useInboxRecommendations } from "./useInboxRecommendations";
import type { UiRecStatus } from "../../../lib/types";

// Берём перечень "all" и считаем локально
export function useRecommendationCounters(clientId: string, opts?: { autoRefreshMs?: number }) {
  const { items, loading, error, reload } = useInboxRecommendations(clientId, "all", { autoRefreshMs: opts?.autoRefreshMs });

  const counts = useMemo(() => {
    const acc: Record<UiRecStatus, number> = { proposed: 0, snoozed: 0, applied: 0, dismissed: 0 };
    for (const r of items) {
      if (r.status in acc) acc[r.status as UiRecStatus]++;
    }
    return acc;
  }, [items]);

  const total = items.length;

  return { counts, total, loading, error, reload };
}
