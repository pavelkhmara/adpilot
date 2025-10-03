export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
// import { getLogs } from "../../../../server/debug/logger";
import { getLogs } from "@/server/debug/logger";


export async function GET(req: Request) {
  if (process.env.DEBUG !== "on") return NextResponse.json({ ok: false, error: "debug_off" }, { status: 403 });
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (token !== process.env.DEBUG_TOKEN) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const ctx = url.searchParams.get("ctx") ?? undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const level = url.searchParams.get("level") as any;
  const since = url.searchParams.get("since") ? Number(url.searchParams.get("since")) : undefined;

  const items = getLogs({ ctx, level, since });
  return NextResponse.json({ ok: true, items });
}
