import type { ExpectedEffect, Rec } from "../../lib/contracts/recommendations";

export type UiRecType = "pause" | "scale" | "creative" | "none";
export type UiRec = { type: UiRecType; title: string; reason?: string; status?: string; validUntil?: string; window?: EffectWin | undefined; observedDeltaAbs?: number | undefined; observedDeltaRel?: number | undefined };
type EffectWin = "T7" | "T14" | "T30";
type UiEffect = { window: EffectWin; observedDeltaAbs: number; observedDeltaRel: number };

const EFFECT_ORDER: Record<string, number> = { T7: 0, T14: 1, T30: 2 };

const TITLE_BY_TYPE: Record<string, string> = {
  pause: "Pause campaign",
  scale: "Increase budget",
  creative: "Rotate creatives",
};

export function toUiRec(rec: Rec | undefined | null): UiRec | undefined {
  if (!rec) return undefined;
  const type = (rec.type as UiRecType) ?? "none";
  const title = TITLE_BY_TYPE[rec.type] ?? rec.type;

  const ui: UiRec = { 
    type, 
    title, 
    reason: rec.reason ?? undefined, 
    status: rec.status ?? undefined, 
    validUntil: rec.validUntil ?? undefined,
    window: undefined,
    observedDeltaAbs: undefined,
    observedDeltaRel: undefined,
  };

  const rawEffects: ExpectedEffect[] = Array.isArray(rec.expectedEffect) ? rec.expectedEffect : [];
  if (rawEffects.length) {
    const effects: UiEffect[] = rawEffects.map((e) => ({
      window: e.horizon as EffectWin,
      observedDeltaAbs: Number(e.expectedDeltaAbs ?? 0),
      observedDeltaRel: Number(e.expectedDeltaRel ?? 0),
    }));

    // выбираем приоритетно T7, если есть; иначе T14; иначе T30
    effects.sort((a, b) => (EFFECT_ORDER[a.window] ?? 9) - (EFFECT_ORDER[b.window] ?? 9));
    const top = effects[0];

    if (top) {
      // новые поля UI — короткие и самодостаточные
      ui.window = top.window;              // "T7" | "T14" | "T30"
      ui.observedDeltaAbs = top.observedDeltaAbs;                 // число (Δ ROAS абсолютная)
      ui.observedDeltaRel = top.observedDeltaRel;           // число (в процентах)
      // если удобнее сгруппировано:
      // ui.effect = { window: top.window, abs: top.observedDeltaAbs, relPct: top.observedDeltaRel };
    }
  }
  return ui;
}
