import { CampaignRow } from "../../lib/types";
import { UiRec } from "./mapRecToUi";

type CampaignRowUI = Omit<CampaignRow, "recommendation"> & { recommendation?: UiRec };

export type SortDir = "asc" | "desc";

const cmpNum = (a: number, b: number, dir: SortDir) => (dir === "asc" ? a - b : b - a);
const cmpStr = (a: string, b: string, dir: SortDir) => (dir === "asc" ? a.localeCompare(b) : b.localeCompare(a));

export function sortByKey(rows: CampaignRowUI[], key: string, dir: SortDir) {
  const arr = [...rows];
  arr.sort((a, b) => {
    switch (key) {
      case "roas": {
        const av = a.spend > 0 ? a.revenue / a.spend : 0;
        const bv = b.spend > 0 ? b.revenue / b.spend : 0;
        return cmpNum(av, bv, dir);
      }
      case "cpa": {
        const aZero = (a.conversions ?? 0) === 0;
        const bZero = (b.conversions ?? 0) === 0;

        if (aZero && bZero) {
          return cmpNum(a.spend ?? Number.POSITIVE_INFINITY, b.spend ?? Number.POSITIVE_INFINITY, "asc");
        }

        const av = aZero ? Number.POSITIVE_INFINITY : (a.spend ?? 0) / (a.conversions ?? 1);
        const bv = bZero ? Number.POSITIVE_INFINITY : (b.spend ?? 0) / (b.conversions ?? 1);
        return cmpNum(av, bv, dir);
      }

      case "ctr": return cmpNum(a.ctr ?? 0, b.ctr ?? 0, dir);
      case "frequency": return cmpNum(a.frequency ?? 0, b.frequency ?? 0, dir);
      case "spend": return cmpNum(a.spend ?? 0, b.spend ?? 0, dir);
      case "revenue": return cmpNum(a.revenue ?? 0, b.revenue ?? 0, dir);
      case "channel": return cmpStr(a.channel ?? "", b.channel ?? "", dir);
      case "name": return cmpStr(a.name ?? "", b.name ?? "", dir);
      case "recommendation": {
        const order = (t?: { type?: string }) =>
          !t ? 9 : t.type === "pause" ? 0 : t.type === "scale" ? 1 : t.type === "creative" ? 2 : 8;
        return cmpNum(order(a.recommendation), order(b.recommendation), dir);
      }
      default: return 0;
    }
  });
  return arr;
}
