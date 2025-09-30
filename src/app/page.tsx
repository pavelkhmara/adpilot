import { cookies } from "next/headers";
import Link from "next/link";
import LandingHome from "../components/landing/LandingHome";

export default async function Home() {
  const store = await cookies();
  const clientId = store.get("clientId")?.value || null;
  const clientName = decodeURIComponent(store.get("clientName")?.value || "");

  if (clientId) {
    return (
      <main className="min-h-screen grid place-items-center p-6 bg-gray-50">
        <div className="max-w-xl w-full rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold mb-2">
            Welcome{clientName ? `, ${clientName}` : ""}!
          </h1>
          <p className="text-gray-500 mb-4">
            You are logged in. Continue to your dashboard.
          </p>
          <Link href="/dashboard" className="px-4 py-2 rounded-xl bg-black text-white">
            Open dashboard →
          </Link>
          <form action="/api/auth/logout" method="post" className="mt-4">
            <button className="text-sm underline text-gray-500">Log out</button>
          </form>
        </div>
      </main>
    );
  }

  return <LandingHome />;
}
