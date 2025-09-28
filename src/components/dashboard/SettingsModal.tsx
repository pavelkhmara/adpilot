"use client";
import NumberField from "../UI/NumberField";
import ThemeToggle from "./ThemeToggle";
import React from "react";

export type DemoSettings = {
  minSpendForPause: number;
  lowRoasThreshold: number;
  highRoasThreshold: number;
  minConversionsForScale: number;
  fatigueFreq: number;
  lowCtrThreshold: number;
  columns?: {
    spend: boolean;
    revenue: boolean;
    roas: boolean;
    cpa: boolean;
    ctr: boolean;
    recommendation: boolean;
    actions: boolean;
  };
  compact?: boolean;
};

type Props = {
  settings: DemoSettings;
  setSettings: React.Dispatch<React.SetStateAction<DemoSettings>>;
  setSettingsOpen: (open: boolean) => void;
  defaultSettings: DemoSettings;
};

export default function SettingsModal({
  settings,
  setSettings,
  setSettingsOpen,
  defaultSettings,
}: Props) {
  return (
    <div
      className="fixed inset-0 bg-black/40 grid place-items-center p-4"
      onClick={() => setSettingsOpen(false)}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-xl w-full p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="text-xl font-semibold">Demo settings</div>
          <button
            className="text-gray-400"
            onClick={() => setSettingsOpen(false)}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <NumberField
            label='Min. spend for «pause», $'
            value={settings.minSpendForPause}
            onChange={(v) =>
              setSettings((s) => ({ ...s, minSpendForPause: v }))
            }
          />
          <NumberField
            label="Low ROAS Threshold"
            step={0.1}
            value={settings.lowRoasThreshold}
            onChange={(v) =>
              setSettings((s) => ({ ...s, lowRoasThreshold: v }))
            }
          />
          <NumberField
            label="High ROAS Threshold"
            step={0.1}
            value={settings.highRoasThreshold}
            onChange={(v) =>
              setSettings((s) => ({ ...s, highRoasThreshold: v }))
            }
          />
          <NumberField
            label='Min. conversions for «scale»'
            value={settings.minConversionsForScale}
            onChange={(v) =>
              setSettings((s) => ({ ...s, minConversionsForScale: v }))
            }
          />
          <NumberField
            label="Fatigue Frequency (Meta)"
            step={0.1}
            value={settings.fatigueFreq}
            onChange={(v) => setSettings((s) => ({ ...s, fatigueFreq: v }))}
          />
          <NumberField
            label="Low CTR Threshold (ratio)"
            step={0.001}
            min={0}
            max={1}
            value={settings.lowCtrThreshold}
            onChange={(v) => setSettings((s) => ({ ...s, lowCtrThreshold: v }))}
          />
        </div>

        <div className="mt-4">
          <div className="text-sm text-gray-600 mb-2">Table columns</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            {([
              ["spend", "Spend"],
              ["revenue", "Revenue"],
              ["roas", "ROAS"],
              ["cpa", "CPA"],
              ["ctr", "CTR"],
              ["recommendation", "Recommendation"],
              ["actions", "Actions"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={!!settings.columns?.[key as keyof NonNullable<typeof settings.columns>]}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      columns: {
                        ...(s.columns ?? defaultSettings.columns!),
                        [key]: e.target.checked,
                      },
                    }))
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <ThemeToggle />
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button
            className="text-sm text-gray-500 underline"
            onClick={() => setSettings(defaultSettings)}
          >
            Reset to defaults
          </button>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 rounded-xl border"
              onClick={() => setSettingsOpen(false)}
            >
              Close
            </button>
            <button
              className="px-3 py-2 rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900"
              onClick={() => setSettingsOpen(false)}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
