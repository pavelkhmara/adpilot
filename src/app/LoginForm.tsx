'use client';

import { useState } from "react";

export default function LoginForm() {
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const form = e.currentTarget;
    const key = (form.elements.namedItem("key") as HTMLInputElement).value.trim();
    const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim();

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: key || undefined, name: name || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error || "Login failed");
        setLoading(false);
        return;
      }
      // Куки выставятся на ответе роутера → переходим в дашборд
      window.location.href = "/dashboard";
    } catch (e) {
      alert("Network error");
      setLoading(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <label className="block">
        <div className="text-sm text-gray-600 mb-1">
          Client key (demo client accounts: <code>acme</code>, <code>orbit</code>, <code>nova</code>, <code>zen</code>)
        </div>
        <input name="key" placeholder="acme" className="w-full px-3 py-2 rounded-xl border" />
      </label>
      <label className="block">
        <div className="text-sm text-gray-600 mb-1">Display name (optional)</div>
        <input name="name" placeholder="Acme Inc." className="w-full px-3 py-2 rounded-xl border" />
      </label>
      <button
        className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-60"
        disabled={loading}
      >
        {loading ? "Signing in..." : "Continue"}
      </button>
    </form>
  );
}
