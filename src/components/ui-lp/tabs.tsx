"use client";
import * as React from "react";

type TabsContextT = {
  value: string;
  setValue: (v: string) => void;
};
const TabsContext = React.createContext<TabsContextT | null>(null);

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  className = "",
  children,
}: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [internal, setInternal] = React.useState(defaultValue || "");
  const controlled = value !== undefined;
  const current = controlled ? value! : internal;

  const setValue = (v: string) => {
    if (!controlled) setInternal(v);
    onValueChange?.(v);
  };

  return (
    <TabsContext.Provider value={{ value: current, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`inline-grid gap-2 rounded-xl border p-1 bg-white ${className}`}
      {...props}
    />
  );
}

export function TabsTrigger({
  value,
  className = "",
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(TabsContext)!;
  const active = ctx.value === value;
  return (
    <button
      type="button"
      onClick={() => ctx.setValue(value)}
      className={`px-4 py-2 rounded-lg text-sm transition ${
        active ? "bg-black text-white" : "hover:bg-slate-100"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className = "",
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(TabsContext)!;
  if (ctx.value !== value) return null;
  return <div className={className}>{children}</div>;
}
