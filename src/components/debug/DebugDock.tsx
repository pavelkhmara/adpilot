'use client'
import { useEffect, useState } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ENABLED = typeof window !== "undefined" && (import.meta as any).env?.VITE_DEBUG_UI === "on" || (process.env.NEXT_PUBLIC_DEBUG_UI ?? "off") === "on" || true;

export default function DebugDock() {
  const [open, setOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [logs, setLogs] = useState<any[]>([]);
  const [ctx, setCtx] = useState<string>(""); // например, "recs"
  const [since, setSince] = useState<number>(() => Date.now() - 5 * 60 * 1000);

  useEffect(() => {
    if (!ENABLED) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "d") setOpen(v => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    let stop = false;
    async function fetchLogs() {
      try {
        const u = new URL(`/api/debug/logs`, window.location.origin);
        u.searchParams.set("token", process.env.NEXT_PUBLIC_DEBUG_TOKEN ?? "dev123");
        if (ctx) u.searchParams.set("ctx", ctx);
        if (since) u.searchParams.set("since", String(since));
        
        const res = await fetch(u.toString());
        const json = await res.json();
        if (!stop && json?.items) setLogs(json.items.slice(-200));
      } catch {}
    }
    fetchLogs();
    const id = setInterval(fetchLogs, 3000);
    return () => { stop = true; clearInterval(id); };
  }, [open, ctx, since]);

  if (!ENABLED || !open) return null;
  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        title="DebugDock (Ctrl+Shift+D)"
        className="fixed bottom-2 right-2 z-40 rounded-full border bg-white/80 px-3 py-1 text-xs shadow"
      >
        debug
      </button>
      {open && (
        <div className="fixed bottom-2 right-2 z-50 w-[520px] max-h-[60vh] bg-white/95 border shadow-xl rounded-xl p-3 text-sm overflow-auto">
          <div className="flex items-center gap-2 mb-2">
            <strong>Debug Dock</strong>
            <input className="border px-2 py-1 rounded text-xs" placeholder="ctx filter (e.g. recs)" value={ctx} onChange={e=>setCtx(e.target.value)} />
            <button className="ml-auto text-xs underline" onClick={() => setLogs([])}>clear</button>
            <button className="text-xs underline" onClick={() => setOpen(false)}>close</button>
          </div>
          <div className="space-y-1">
            {logs.map((l, i) => (
              <div key={i} className="border rounded p-2">
                <div className="flex gap-2 text-xs">
                  <span className="opacity-60">{new Date(l.ts).toLocaleTimeString()}</span>
                  <span className={`uppercase ${l.level === "error" ? "text-red-600" : l.level === "warn" ? "text-amber-600" : "text-slate-600"}`}>{l.level}</span>
                  {l.ctx && <span className="font-mono">{l.ctx}</span>}
                  {l.requestId && <span className="opacity-60">({l.requestId.slice(0,8)})</span>}
                </div>
                <div className="font-medium">{l.msg}</div>
                {l.data && <pre className="text-[11px] bg-slate-50 p-2 rounded overflow-auto">{JSON.stringify(l.data, null, 2)}</pre>}
              </div>
            ))}
          </div>
        </div>
        )}
    </>
  );
}
