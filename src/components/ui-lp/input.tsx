import * as React from "react";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`h-10 w-full rounded-xl border px-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-black/10 ${className}`}
      {...props}
    />
  )
);
Input.displayName = "Input";
