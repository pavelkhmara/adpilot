import { CampaignRow, FetchFilters } from "../../lib/types";


export type ServerFetchFilters = FetchFilters & {
  clientId?: string;
  
  // pagination
  limit?: number;
  offset?: number;
};

export type ListCampaignsResponse = {
  items: CampaignRow[];
};