"use client";
import React, { useEffect } from "react";

type Props = {
  setShowHotkeys: (open: boolean) => void;
};

export default function HotKeysModal({ setShowHotkeys }: Props) {
  // Close by Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowHotkeys(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setShowHotkeys]);

  return (
    <div
      className="fixed inset-0 bg-black/40 p-4 grid place-items-center"
      onClick={() => setShowHotkeys(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div className="text-lg font-semibold">Hot keys</div>
          <button
            className="text-gray-400"
            onClick={() => setShowHotkeys(false)}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4 text-sm">
          <ul className="space-y-2">
            <li>
              <kbd className="px-2 py-1 rounded border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                /
              </kbd>{" "}
              — focus search
            </li>
            <li>
              <kbd className="px-2 py-1 rounded border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                Esc
              </kbd>{" "}
              — close modal/hint
            </li>
            <li>
              <kbd className="px-2 py-1 rounded border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                Ctrl
              </kbd>
              /
              <kbd className="px-2 py-1 rounded border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                ⌘
              </kbd>{" "}
              +{" "}
              <kbd className="px-2 py-1 rounded border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                K
              </kbd>{" "}
              — open settings
            </li>
            <li>
              <kbd className="px-2 py-1 rounded border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                ?
              </kbd>{" "}
              — show keyboard shortcuts
            </li>
          </ul>
        </div>
        <div className="px-5 py-3 border-t text-right">
          <button
            className="px-3 py-2 rounded-xl border"
            onClick={() => setShowHotkeys(false)}
          >
            Ok
          </button>
        </div>
      </div>
    </div>
  );
}
