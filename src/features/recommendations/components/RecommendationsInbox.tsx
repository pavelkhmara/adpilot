import { useMemo, useState } from "react";
import { useInboxRecommendations } from "../hooks/useInboxRecommendations";
import { useRecommendationActions } from "../hooks/useRecommendationActions";
import type { UiRecStatus, UiRecommendation } from "../../../lib/types";
import RecBadge from "@/components/UI/RecBadge";
import { useRecommendationCounters } from "../hooks/useRecommendationCounters";

type Props = { clientId: string };

const STATUS_FILTERS: Array<UiRecStatus | "all"> = ["all", "proposed", "snoozed", "applied", "dismissed"];

export default function RecommendationsInbox({ clientId }: Props) {
  const [status, setStatus] = useState<UiRecStatus | "all">("proposed");
  const { items, loading, error, patchLocal, reload } = useInboxRecommendations(clientId, status, { autoRefreshMs: 45_000 });
  const { apply, snooze, dismiss } = useRecommendationActions({ patchLocal, reload });
  const { counts, total } = useRecommendationCounters(clientId, { autoRefreshMs: 60_000 });

  const sorted = useMemo(() => {
    const prio = (t: UiRecommendation["type"]) => t === "pause" ? 0 : t === "scale" ? 1 : t === "creative" ? 2 : 9;
    return [...items].sort((a, b) => {
        let name = true
        if (!a.title || !b.title) name = false;
        return prio(a.type) - prio(b.type) || (name ? a?.title.localeCompare(b?.title) : a.createdAt.localeCompare(b.createdAt))
    });
  }, [items]);

  const badge = (n?: number) => (
    <span className="ml-1 text-[11px] px-1.5 py-0.5 rounded bg-gray-100 border">{n ?? 0}</span>
  );

  return (
    <div className="rounded-2xl border p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">Status:</span>
          <button
            className={`border rounded px-2 py-1 text-sm ${status === "all" ? "bg-gray-100" : ""}`}
            onClick={() => setStatus("all")}
            title="All"
          >
            All {badge(total)}
          </button>

          <button
            className={`border rounded px-2 py-1 text-sm ${status === "proposed" ? "bg-gray-100" : ""}`}
            onClick={() => setStatus("proposed")}
            title="Proposed"
          >
            Proposed {badge(counts.proposed)}
          </button>

          <button
            className={`border rounded px-2 py-1 text-sm ${status === "snoozed" ? "bg-gray-100" : ""}`}
            onClick={() => setStatus("snoozed")}
            title="Snoozed"
          >
            Snoozed {badge(counts.snoozed)}
          </button>

          <button
            className={`border rounded px-2 py-1 text-sm ${status === "applied" ? "bg-gray-100" : ""}`}
            onClick={() => setStatus("applied")}
            title="Applied"
          >
            Applied {badge(counts.applied)}
          </button>

          <button
            className={`border rounded px-2 py-1 text-sm ${status === "dismissed" ? "bg-gray-100" : ""}`}
            onClick={() => setStatus("dismissed")}
            title="Dismissed"
          >
            Dismissed {badge(counts.dismissed)}
          </button>
          <button onClick={() => reload()} className="ml-auto border rounded px-2 py-1 text-sm">Refresh</button>
        </div>

        {loading && <div className="text-sm opacity-70">Loading…</div>}
        {error && <div className="text-sm text-red-600">Failed to load</div>}
        {!loading && sorted.length === 0 && <div className="text-sm opacity-70">No recommendations</div>}

        <ul className="flex flex-col gap-2">
          {sorted.map(r => (
            <li key={r.id} className="border rounded p-3">
              <div className="flex items-center gap-2">
                {/* <span className="text-xs uppercase bg-gray-100 rounded px-2 py-0.5">{r.type}</span> */}
                <RecBadge type={r.type} text={r.type} />
                <span className="text-xs rounded px-2 py-0.5 border">{r.status}</span>
                <span className="font-medium">{r.title}</span>
                <span className="ml-auto text-xs opacity-60">{new Date(r.updatedAt).toLocaleString()}</span>
              </div>
              {r.reason && <div className="text-sm opacity-80 mt-1">{r.reason}</div>}
              <div className="flex gap-2 mt-2">
                {r.status !== "applied" && (
                  <button
                    className="border rounded px-2 py-1 text-sm"
                    onClick={() => apply({ id: r.id })}
                  >Apply</button>
                )}
                <button
                  className="border rounded px-2 py-1 text-sm"
                  onClick={() => {
                    const in7days = new Date(Date.now() + 7*24*60*60*1000).toISOString();
                    snooze({ id: r.id, until: in7days });
                  }}
                >Snooze 7d</button>
                {r.status !== "dismissed" && (
                  <button
                    className="border rounded px-2 py-1 text-sm"
                    onClick={() => dismiss({ id: r.id, reason: "not_relevant" })}
                  >Dismiss</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
