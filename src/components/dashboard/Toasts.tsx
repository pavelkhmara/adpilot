"use client";
import React, { createContext, useContext, useMemo, useState } from "react";

type Toast = { id: string; text: string };
type Ctx = { pushToast: (text: string) => void };

const ToastsContext = createContext<Ctx | null>(null);
export function useToasts() {
  const ctx = useContext(ToastsContext);
  if (!ctx) throw new Error("useToasts must be used within <ToastsProvider/>");
  return ctx;
}

export function ToastsProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const ctx = useMemo<Ctx>(() => ({
    pushToast: (text: string) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, text }]);
      setTimeout(() => setToasts((prev) => prev.filter(t => t.id !== id)), 3200);
    },
  }), []);

  return (
    <ToastsContext.Provider value={ctx}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(t => (
          <div key={t.id} className="toast rounded-xl text-sm px-3 py-2 shadow">
            {t.text}
          </div>
        ))}
      </div>
    </ToastsContext.Provider>
  );
}
