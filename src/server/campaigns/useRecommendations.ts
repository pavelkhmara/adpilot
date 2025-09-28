import { Channel, Recommendation } from "../../lib/types";

export function buildRecommendation(input: {
  spend: number;
  revenue: number;
  conversions: number;
  ctr: number;
  frequency: number;
  channel: Channel;

  lowRoas?: number;
  highRoas?: number;
  minSpendForPause?: number;
  minConversionsForScale?: number;
  fatigueFreq?: number;
  lowCtr?: number;
}): Recommendation | undefined {
  const {
    spend, revenue, conversions, ctr, frequency, channel,
    lowRoas = 1.5, highRoas = 3.0, minSpendForPause = 1000,
    minConversionsForScale = 50, fatigueFreq = 2.5, lowCtr = 0.02,
  } = input;

  const roas = spend > 0 ? revenue / spend : 0;

  // 1) Pause
  if (spend >= minSpendForPause && roas < lowRoas) {
    return { type: "pause", title: "Pause campaign", reason: `Low ROAS (${roas.toFixed(2)}) with spend ${spend.toFixed(0)}` };
  }

  // 2) Scale
  if (conversions >= minConversionsForScale && roas >= highRoas) {
    return { type: "scale", title: "Increase budget", reason: `High ROAS (${roas.toFixed(2)}) and ${conversions} conv.` };
  }

  // 3) Creative fatigue (особенно Meta)
  if (channel === "Meta Ads" && frequency >= fatigueFreq && ctr <= lowCtr) {
    return { type: "creative", title: "Rotate creatives", reason: `High freq (${frequency.toFixed(1)}) & low CTR (${(ctr*100).toFixed(2)}%)` };
  }

  return undefined;
}
