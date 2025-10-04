import { useEffect, useRef } from 'react';

export function usePolling(fn: () => void | Promise<void>, intervalMs: number, enabled = true) {
  const saved = useRef(fn);
  useEffect(() => { saved.current = fn; }, [fn]);
  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;
    let cancelled = false;
    const tick = async () => { if (!cancelled) await saved.current(); };
    const id = setInterval(tick, intervalMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [intervalMs, enabled]);
}