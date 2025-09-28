import React from 'react'

type NumberFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
};

export default function NumberField({
  label, value, onChange, step = 1, min, max,
}: NumberFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-gray-600">{label}</span>
      <input
        type="number"
        className="px-3 py-2 rounded-xl border"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}