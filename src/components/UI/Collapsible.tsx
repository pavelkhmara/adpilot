import React from 'react'

export default function Collapsible({
  title, open, onToggle, children,
}: React.PropsWithChildren<{ title: string; open: boolean; onToggle: () => void }>) {
  return (
    <section className="rounded-xl border border-gray-300 border-app">
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-left"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="text-sm font-medium">{title}</span>
        <span className="text-gray-500">{open ? "▾" : "▸"}</span>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </section>
  );
}
