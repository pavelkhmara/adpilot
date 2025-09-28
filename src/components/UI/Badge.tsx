import React from 'react'

type Tone = "gray" | "green" | "red" | "amber" | "blue";

export default function Badge({ children, tone = "gray" }: { children: React.ReactNode; tone?: Tone }) {
  const map: Record<Tone, string> = {
    gray: "bg-gray-100 text-gray-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
  };
  return <span className={`px-2 py-1 rounded-full text-xs ${map[tone]}`}>{children}</span>;
}