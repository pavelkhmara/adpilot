import { Rec, RecListResponse } from "@/lib/contracts";
import { useEffect, useState } from "react";

// type ByCampaign = Record<string, Rec | undefined>;

export function useRecommendations(campaignIds: string[], clientId?: string) {
  const [map, setMap] = useState<Record<string, Rec | undefined>>({});
  const [version, setVersion] = useState(0);

  const refresh = () => setVersion(v => v + 1);

  useEffect(() => {
    let alive = true;
    (async () => {
      const qs = clientId ? `?clientId=${clientId}` : "";
      const res = await fetch(`/api/recommendations${qs}`);
      const data: RecListResponse = await res.json();
      const by: Record<string, Rec | undefined> = {};

      for (const r of data.items) {
        const id = r.target.campaignId ?? "";
        if (id) by[id] = r;
      }
      if (alive) setMap(by);
    })();
    return () => { alive = false; };
  }, [clientId, campaignIds.join(","), version]);

  return { map, refresh };
}
