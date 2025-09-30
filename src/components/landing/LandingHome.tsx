"use client";

import { useState } from "react";
import Link from "next/link";
import LoginForm from "@/app/LoginForm"; // ваша форма логина (уже есть)
import LanguageSwitch from "./LanguageSwitch";

type Lang = "en" | "ru" | "pl";

const COPY: Record<Lang, { title: string; accent: string; subtitle: string; ctas: { primary: string; secondary: string } }> = {
  en: {
    title: "Actionable insights for your ads.",
    accent: "One click to apply.",
    subtitle:
      "Ad Pilot aggregates performance from Meta, Google Ads & more, then surfaces prioritized recommendations you can apply safely — with guardrails — right from the dashboard.",
    ctas: { primary: "See live demo", secondary: "For recruiters & tech leads" },
  },
  ru: {
    title: "Практичные инсайты для вашей рекламы.",
    accent: "Применяйте в один клик.",
    subtitle:
      "Ad Pilot собирает метрики из Meta, Google Ads и др., формирует приоритезированные рекомендации и позволяет безопасно применить изменения прямо из панели — с ограничителями и откатом.",
    ctas: { primary: "Посмотреть демо", secondary: "Для рекрутеров и техлидов" },
  },
  pl: {
    title: "Praktyczne insighty dla Twoich kampanii.",
    accent: "Jedno kliknięcie, aby zastosować.",
    subtitle:
      "Ad Pilot łączy wyniki z Meta, Google Ads i innych, priorytetyzuje rekomendacje i pozwala bezpiecznie zastosować zmiany bezpośrednio z panelu — z zabezpieczeniami i możliwością cofnięcia.",
    ctas: { primary: "Zobacz demo", secondary: "Dla rekruterów i tech leadów" },
  },
};

export default function LandingHome() {
  const [lang, setLang] = useState<Lang>("en");
  const t = COPY[lang];

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-white via-white to-slate-50">
      {/* NAVBAR */}
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-black text-white grid place-items-center font-bold">AP</div>
            <span className="font-semibold tracking-tight">Ad Pilot</span>
            <span className="ml-2 rounded-md border px-2 py-0.5 text-xs">MVP</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600">
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#tech" className="hover:text-slate-900">Tech</a>
            <a href="#contact" className="hover:text-slate-900">Contact</a>
          </nav>
          <div className="flex items-center gap-3">
            <LanguageSwitch value={lang} onChange={setLang} />
            <Link href="/dashboard" className="px-3 py-2 rounded-md border hover:bg-slate-50">
              Open App
            </Link>
          </div>
        </div>
      </header>

      {/* HERO with Login on the right */}
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-10">
        <div className="grid md:grid-cols-2 gap-10 items-start">
          <div>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
              {t.title}{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500">
                {t.accent}
              </span>
            </h1>
            <p className="mt-4 text-lg text-slate-600 max-w-xl">{t.subtitle}</p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <a href="#demo" className="h-11 px-6 inline-flex items-center justify-center rounded-xl bg-black text-white">
                {t.ctas.primary}
              </a>
              <a href="#tech" className="h-11 px-6 inline-flex items-center justify-center rounded-xl border">
                {t.ctas.secondary}
              </a>
            </div>
            <div className="mt-6 flex items-center gap-4 text-sm text-slate-500">
              <div>Safe apply</div>
              <div>MVP ready</div>
              <div>AI-assisted</div>
            </div>
          </div>

          {/* Login card (ваш LoginForm) */}
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-1">
              {lang === "pl" ? "Zaloguj się" : lang === "ru" ? "Войдите" : "Sign in"}
            </h2>
            <p className="text-gray-500 mb-4">
              {lang === "pl"
                ? <>Użyj istniejącego <code>client key</code> (np. <code>acme</code>) albo zostaw puste, aby utworzyć demo klienta.</>
                : lang === "ru"
                ? <>Используйте существующий <code>client key</code> (напр. <code>acme</code>) или оставьте пустым — создастся демо-клиент.</>
                : <>Use an existing <code>client key</code> (e.g. <code>acme</code>) or leave empty to create a demo client.</>}
            </p>
            <LoginForm />
            <form action="/api/auth/login" method="post" className="mt-3">
                <input type="hidden" name="clientKey" value="" />
                <button
                    type="submit"
                    className="w-full h-10 rounded-xl border font-medium hover:bg-slate-50"
                >
                    Continue as demo
                </button>
            </form>
          </div>
        </div>
      </section>

      {/* Можно позже добавить остальные секции (features/tech/demo/footer) из расширенного лендинга */}
      <footer id="contact" className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-8 grid md:grid-cols-3 gap-8 text-sm">
          <div>
            <div className="font-semibold">Ad Pilot</div>
            <p className="text-slate-600 mt-2">
              Built by Pavel Khmara — entrepreneur & full-stack developer (Warsaw, PL).
            </p>
          </div>
          <div>
            <div className="font-semibold">Open Source</div>
            <ul className="mt-2 space-y-1 text-slate-600">
              <li><a className="underline" href="https://github.com/pavelkhmara/telegram-bot-nodejs" target="_blank" rel="noreferrer">telegram-bot-nodejs</a></li>
              <li><a className="underline" href="https://github.com/pavelkhmara/tg-app2-react" target="_blank" rel="noreferrer">tg-app2-react</a></li>
              <li><a className="underline" href="https://github.com/pavelkhmara/tg-app2-nodejs" target="_blank" rel="noreferrer">tg-app2-nodejs</a></li>
              <li><a className="underline" href="https://github.com/pavelkhmara/react-spa" target="_blank" rel="noreferrer">react-spa</a></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold">Contact</div>
            <ul className="mt-2 space-y-1 text-slate-600">
              <li><a className="underline" href="mailto:pavel.khmara@gmail.com">pavel.khmara@gmail.com</a></li>
              <li><a className="underline" href="https://www.linkedin.com/in/pavel-khmara/" target="_blank" rel="noreferrer">LinkedIn</a></li>
            </ul>
          </div>
        </div>
        <div className="text-center text-xs text-slate-500 pb-8">© {new Date().getFullYear()} Ad Pilot</div>
      </footer>
    </div>
  );
}
