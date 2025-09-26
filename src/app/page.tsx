import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen grid place-items-center p-6 bg-gray-50">
      <div className="max-w-xl w-full rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">AdPilot</h1>
        <p className="text-gray-600 mt-2">
          Clickable mockup of an ad campaign recommendations panel.
        </p>
        <div className="mt-4 flex gap-3">
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-xl bg-gray-900 text-white"
          >
            Open Dashboard
          </Link>
          <a
            href="https://nextjs.org/docs"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-xl border"
          >
            Next.js Docs
          </a>
        </div>
      </div>
    </main>
  );
}
