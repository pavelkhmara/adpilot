import { useCallback, useEffect, useState } from "react";
import type { UiRecommendation, UiRecStatus } from "../../../lib/types";

// const mem = new Map<string, UiRecommendation[]>();

// async function fetchRecommendations(clientId: string, status?: UiRecStatus | "all") {
//   const qs = new URLSearchParams({ clientId });
//   if (status && status !== "all") qs.set("status", status);
//   const res = await fetch(`/api/recommendations?${qs.toString()}`, { cache: "no-store" });
//   if (!res.ok) throw new Error(`Failed to fetch recommendations: ${res.status}`);
//   const data = await res.json() as { items: UiRecommendation[]; generatedAt: string };
//   return data.items;
// }


export function useInboxRecommendations(
  clientId: string,
  status: UiRecStatus | "all",
  opts?: { autoRefreshMs?: number }
) {
  const [items, setItems] = useState<UiRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ clientId });
      // если API уже поддерживает статус — хорошо; если нет, это не помешает
      if (status && status !== "all") qs.set("status", status);
      const res = await fetch(`/api/recommendations?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error("Failed to load");
      const all: UiRecommendation[] = json.items ?? [];


      // Клиентская фильтрация — гарантированно
      const filtered = status === "all" ? all : all.filter(r => r.status === status);
      setItems(filtered);
      setError(null);
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err ? err?.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [clientId, status]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!opts?.autoRefreshMs) return;
    const id = setInterval(load, opts.autoRefreshMs);
    return () => clearInterval(id);
  }, [opts?.autoRefreshMs, load]);

  // локальный патч + уважение текущего фильтра
  const patchLocal = useCallback((id: string, patch: Partial<UiRecommendation>) => {
    setItems(prev => {
      const next = prev.map(it => it.id === id ? { ...it, ...patch, updatedAt: new Date().toISOString() } : it);
      return status === "all" ? next : next.filter(it => it.status === status);
    });
  }, [status]);

  return { items, loading, error, patchLocal, reload: load };
}

// export function useInboxRecommendations(clientId: string, status: UiRecStatus | "all" = "all", opts?: { autoRefreshMs?: number }) {
//   const key = `${clientId}:${status}`;
//   const [items, setItems] = useState<UiRecommendation[]>(() => mem.get(key) ?? []);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const autoRefreshMs = opts?.autoRefreshMs;

//   const reload = useCallback(async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       const list = await fetchRecommendations(clientId, status);
//       mem.set(key, list);
//       setItems(list);
//     } catch (e: unknown) {
//         const err = e instanceof Error ? e : new Error(String(e));
//         setError(err ? err?.message : 'Error');
//     } finally {
//       setLoading(false);
//     }
//   }, [clientId, status, key]);

//   useEffect(() => { void reload(); }, [reload]);

//   useEffect(() => {
//     if (!autoRefreshMs) return;
//     let timer: NodeJS.Timeout;

//     const tick = () => {
//       if (document.visibilityState === "visible") {
//         void reload();
//       }
//       timer = setTimeout(tick, autoRefreshMs);
//     };

//     timer = setTimeout(tick, autoRefreshMs);
//     const onVis = () => {
//       if (document.visibilityState === "visible") void reload();
//     };
//     document.addEventListener("visibilitychange", onVis);

//     return () => {
//       clearTimeout(timer);
//       document.removeEventListener("visibilitychange", onVis);
//     };
//   }, [autoRefreshMs, reload]);

//   const map = useMemo(() => new Map(items.map(i => [i.id, i])), [items]);

//   const patchLocal = useCallback((id: string, patch: Partial<UiRecommendation>) => {
//     setItems(prev => {
//       const next = prev.map(r => r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r);
//       mem.set(key, next);
//       return next;
//     });
//   }, [key]);

//   return { items, map, loading, error, reload, patchLocal, setItems };
// }
