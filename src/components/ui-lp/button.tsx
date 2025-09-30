"use client";
import * as React from "react";

type Variant = "default" | "outline" | "ghost" | "secondary" | "destructive";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-60 disabled:pointer-events-none";
const variants: Record<Variant, string> = {
  default: "bg-black text-white hover:bg-black/90",
  outline: "border hover:bg-slate-50",
  ghost: "hover:bg-slate-100",
  secondary: "bg-slate-900/5 hover:bg-slate-900/10",
  destructive: "bg-red-600 text-white hover:bg-red-600/90",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4",
  lg: "h-11 px-6 text-base",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

export function Button({
  variant = "default",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    />
  );
}
