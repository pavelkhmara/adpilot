import { Rec } from "@/lib/contracts";
import useSWR from "swr";

type ByCampaign = Record<string, Rec | undefined>;

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useRecommendations(campaignIds: string[]) {
  const key = campaignIds.length
    ? `/api/recommendations/by-campaign?ids=${encodeURIComponent(campaignIds.join(","))}`
    : null;

  const { data, error, isLoading, mutate } = useSWR(key, fetcher, { revalidateOnFocus: false });
  
  
  
  const map: ByCampaign = {};
  if (data?.items) {
    for (const it of data.items) {
      map[it.campaignId ? it.campaignId : it.id] = it;
    }
  }

  return { map, loading: !!key && (isLoading && !data), error, refresh: mutate };
}
