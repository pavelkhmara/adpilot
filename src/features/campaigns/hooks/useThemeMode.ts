import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

export function useThemeMode() {
  const [theme, setTheme] = useState<ThemeMode>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = typeof window !== "undefined" ? localStorage.getItem("adpilot_theme") : null;
    if (saved === "light" || saved === "dark" || saved === "system") setTheme(saved);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;

    const apply = (m: ThemeMode) => {
      if (m === "system") root.setAttribute("data-theme", window.matchMedia("(prefers-color-scheme: light)").matches ? "dark" : "light");
      else root.setAttribute("data-theme", m);
    };
    apply(theme);
    localStorage.setItem("adpilot_theme", theme);

    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => { if (theme === "system") apply("system"); };
    mq.addEventListener?.("change", onChange); return () => mq.removeEventListener?.("change", onChange);
  }, [theme, mounted]);
  
  return { theme, setTheme, mounted };
}
