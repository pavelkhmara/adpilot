import { cookies } from "next/headers";
import Link from "next/link";
import LoginForm from "./LoginForm";

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
          <p className="text-gray-500 mb-4">You are logged in. Continue to your dashboard.</p>
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

  return (
    <main className="min-h-screen grid place-items-center p-6 bg-gray-50">
      <div className="max-w-xl w-full rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mt-4 flex flex-col gap-3">
          <h1 className="text-2xl font-semibold mb-2">Sign in to AdPilot</h1>
          <p className="text-gray-500 mb-4">
            Use an existing client key (e.g. <code>acme</code>) or leave empty to create a demo client.
          </p>
          <LoginForm />

        </div>
      </div>
    </main>
  );
  
  // return (
  //   <main className="min-h-screen grid place-items-center p-6 bg-gray-50">
  //     <div className="max-w-xl w-full rounded-2xl border bg-white p-6 shadow-sm">
  //       <h1 className="text-2xl font-semibold">AdPilot</h1>
  //       <p className="text-gray-600 mt-2">
  //         Clickable mockup of an ad campaign recommendations panel.
  //       </p>
  //       <div className="mt-4 flex gap-3">
  //         <Link
  //           href="/dashboard"
  //           className="px-4 py-2 rounded-xl bg-gray-900 text-white"
  //         >
  //           Open Dashboard
  //         </Link>
  //         <a
  //           href="https://nextjs.org/docs"
  //           target="_blank"
  //           rel="noreferrer"
  //           className="px-4 py-2 rounded-xl border"
  //         >
  //           Next.js Docs
  //         </a>
  //       </div>
  //     </div>
  //   </main>
  // );
}
