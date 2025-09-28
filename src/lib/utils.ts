import { ClientId } from "../lib/types";

export function fmtMoney(n: number) { return n.toFixed(2); }
export function fmtInt(n: number) { return new Intl.NumberFormat("en").format(n); }
export function safeStringify(v: unknown, space = 2) {
  try { return JSON.stringify(v, null, space); } catch { return String(v); }
}

export function toClientId(v: string | null | undefined): ClientId {
  switch (v) {
    case "acme": case "orbit": case "nova": case "zen": return v;
    default: return "acme";
  }
}