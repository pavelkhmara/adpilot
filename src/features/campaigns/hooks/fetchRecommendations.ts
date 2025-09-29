import { UiRec } from "@/app/api/recommendations/by-campaign/route";
import useSWR from "swr";

// type Rec = { type: "pause" | "scale" | "creative" | "none"; title: string; reason?: string };
type ByCampaign = Record<string, UiRec | undefined>;

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useRecommendations(campaignIds: string[]) {
  const key = campaignIds.length
    ? `/api/recommendations/by-campaign?ids=${encodeURIComponent(campaignIds.join(","))}`
    : null;

  const { data, error, isLoading, mutate } = useSWR(key, fetcher, { revalidateOnFocus: false });

  console.log('[fetchRecommendations] data: ', data);
  
  const map: ByCampaign = {};
  if (data?.items) {
    for (const it of data.items as UiRec[]) {
      map[it.campaignId] = it;
    }
  }

  return { map, loading: !!key && (isLoading && !data), error, refresh: mutate };
}
