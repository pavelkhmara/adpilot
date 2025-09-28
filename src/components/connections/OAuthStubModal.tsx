'use client';

import { useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  provider: 'google' | 'meta' | null;
  onConfirm: (provider: 'google' | 'meta') => Promise<void>;
};

export function OAuthStubModal({ open, onClose, provider, onConfirm }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  if (!open || !provider) return null;

  const title = provider === 'google' ? 'Google Ads' : 'Meta Ads';

  async function handleConfirm() {
    setSubmitting(true);
    try {
      if (provider === null) return null;
      await onConfirm(provider);
      onClose();
      setStep(1);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3">
          <h3 className="text-lg font-semibold">Connect {title}</h3>
          <p className="text-sm opacity-70">
            This is a <b>demo</b> OAuth flow. No real permissions are requested.
          </p>
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <div className="rounded-lg border p-3">
              <div className="font-medium mb-1">Step 1 — Choose account</div>
              <div className="text-sm opacity-70">demo-{provider}-account@example.com</div>
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-1.5 rounded-lg" onClick={onClose}>Cancel</button>
              <button
                className="px-3 py-1.5 rounded-lg bg-black text-white"
                onClick={() => setStep(2)}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="rounded-lg border p-3">
              <div className="font-medium mb-1">Step 2 — Permissions</div>
              <ul className="text-sm list-disc pl-5 opacity-80">
                <li>Read ad accounts</li>
                <li>Read campaigns & metrics</li>
              </ul>
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-1.5 rounded-lg" onClick={onClose}>Cancel</button>
              <button
                className="px-3 py-1.5 rounded-lg bg-black text-white disabled:opacity-50"
                disabled={submitting}
                onClick={handleConfirm}
              >
                {submitting ? 'Connecting…' : 'Allow & Connect'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
