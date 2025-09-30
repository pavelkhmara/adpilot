"use client";

type Lang = "en" | "ru" | "pl";

export default function LanguageSwitch({
  value,
  onChange,
}: {
  value: Lang;
  onChange: (v: Lang) => void;
}) {
  return (
    <select
      aria-label="Language"
      className="rounded-md border px-2 py-1 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value as Lang)}
    >
      <option value="en">EN</option>
      <option value="ru">RU</option>
      <option value="pl">PL</option>
    </select>
  );
}
