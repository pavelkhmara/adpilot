import { Rec, RecListResponse } from "../../../lib/contracts";
import { useEffect, useState } from "react";

// type ByCampaign = Record<string, Rec | undefined>;
// type Rec = {
//   id: string;
//   target?: { campaignId?: string | null };
//   campaignId?: string | null; // на случай, если target не заполнен
//   // ... любые прочие поля
// };

type RecState = {
  items: Rec[];
  byCampaign: Record<string, Rec | undefined>;
};

export function useRecommendations(campaignIds: string[], clientId?: string) {
  const [map, setMap] = useState<Record<string, Rec | undefined>>({});
  const [version, setVersion] = useState(0);

  const refresh = () => setVersion(v => v + 1);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const qs = clientId ? `?clientId=${clientId}` : "";
        const t0 = performance.now();
        const res = await fetch(`/api/recommendations${qs}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
  
        const data: RecListResponse = await res.json();
        console.debug("[recs.fetch]", { status: res.status, ms: Math.round(performance.now() - t0), items: Array.isArray(data?.items) ? data.items.length : Array.isArray(data) ? data.length : 0, sample: (data?.items ?? data)?.[0] });
        const itemsArr: Rec[] = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
            ? data
            : [];
        const by: Record<string, Rec | undefined> = {};
  
        for (const r of itemsArr) {
          const id = (r && r.target && (r.target).campaignId) ?? "";
          if (id) by[id] = r;
        }
        if (alive) setMap(by);
      } catch (e) {
        console.warn("[fetchRecommendations] failed:", e);
        if (alive) {
          setMap({});
        }
      }
    })();
    return () => { alive = false; };
  }, [clientId, campaignIds.join(","), version]);

  function mutate(campaignId: string, patch: Partial<Rec>) {
  setMap(prev => {
    const cur = prev[campaignId];
    if (!cur) return prev;
    return { ...prev, [campaignId]: { ...cur, ...patch } };
  });
}

  return { map, refresh, mutate };
}
