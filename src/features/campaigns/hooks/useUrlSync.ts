import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isValidYmd } from "../../../lib/dates";

export function useUrlSync(state: {
  client?: string; q?: string; channel?: string;
  sort?: string; dir?: "asc"|"desc"|null; mode?: "ro"|null;
  from?: string; to?: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const urlState = useMemo(() => state, [ JSON.stringify(state) ]);

  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(urlState).forEach(([k, v]) => {
        if (v) params.set(k, String(v)); 
      });
    router.replace(params.toString() ? `?${params}` : "");
  }, [urlState, router]);

  // helpers to read initial
  const initial = useMemo(() => {
    const get = (k: string) => sp.get(k) || undefined;
    const from = get("from");
    const to = get("to");
    return {
      from: isValidYmd(from) ? (from as string) : undefined,
      to:   isValidYmd(to)   ? (to   as string) : undefined,
    };
  }, [sp]);
  return initial;
}
