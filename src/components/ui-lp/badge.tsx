import * as React from "react";

export function Badge({
  children,
  className = "",
  variant = "default",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "secondary" | "outline";
}) {
  const styles: Record<string, string> = {
    default: "bg-black text-white border-transparent",
    secondary: "bg-slate-100 text-slate-700 border-transparent",
    outline: "bg-transparent text-slate-700 border",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs border ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
