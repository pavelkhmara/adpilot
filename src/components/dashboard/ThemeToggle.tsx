"use client";
import { useThemeMode, type ThemeMode } from "@/features/campaigns/hooks/useThemeMode";

export default function ThemeToggle() {
  const { theme, setTheme, mounted } = useThemeMode();
  if (!mounted) return null;

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-gray-500">Theme</span>
      <select
        className="px-2 py-1.5 rounded-xl border text-sm bg-app border-app"
        value={theme}
        onChange={(e) => setTheme(e.target.value as ThemeMode)}
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </label>
  );
}
