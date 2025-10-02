import type { Rec } from "../../lib/contracts/recommendations";

export function filterInbox(recs: Rec[]) {
  const now = Date.now();
  return recs.filter(r => {
    if (r.status === "dismissed") return false;
    if (r.validUntil && new Date(r.validUntil).getTime() > now) return false;
    return true;
  });
}
