import { useCallback } from "react";
import type { UiRecommendation } from "../../../lib/types";

type ApplyPayload = { id: string; note?: string; idempotencyKey?: string };
type SnoozePayload = { id: string; until: string; note?: string; idempotencyKey?: string };
type DismissPayload = { id: string; reason?: string; note?: string; idempotencyKey?: string };

function idemKey(s: object) {
  // простой детерминированный ключ
  return "idem:" + Buffer.from(JSON.stringify(s)).toString("base64");
}

export function useRecommendationActions(opts: {
  patchLocal: (id: string, patch: Partial<UiRecommendation>) => void;
  reload: () => Promise<void>;
}) {
  const { patchLocal, reload } = opts;

  const apply = useCallback(async ({ id, note, idempotencyKey }: ApplyPayload) => {
    const body = { id, note, idempotencyKey: idempotencyKey ?? idemKey({ id, note, kind: "apply" }) };
    // optimistic
    patchLocal(id, { status: "applied", note });
    const res = await fetch("/api/recommendations/apply", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
    if (!res.ok) {
      await reload();
    }
  }, [patchLocal, reload]);

  const snooze = useCallback(async ({ id, until, note, idempotencyKey }: SnoozePayload) => {
    const body = { id, until, note, idempotencyKey: idempotencyKey ?? idemKey({ id, until, note, kind: "snooze" }) };
    patchLocal(id, { status: "snoozed", validUntil: until, note });
    const res = await fetch("/api/recommendations/snooze", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
    if (!res.ok) await reload();
  }, [patchLocal, reload]);

  const dismiss = useCallback(async ({ id, reason, note, idempotencyKey }: DismissPayload) => {
    const body = { id, reason, note, idempotencyKey: idempotencyKey ?? idemKey({ id, reason, note, kind: "dismiss" }) };
    patchLocal(id, { status: "dismissed", note });
    const res = await fetch("/api/recommendations/dismiss", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
    if (!res.ok) await reload();
  }, [patchLocal, reload]);

  return { apply, snooze, dismiss };
}
