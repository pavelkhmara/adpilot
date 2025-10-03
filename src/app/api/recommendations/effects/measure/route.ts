import { NextResponse } from "next/server";
import { measureEffects } from "../../../../../server/recommendations/effects";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const win = (url.searchParams.get("window") ?? "T7") as "T7" | "T14" | "T30";
  const res = await measureEffects({ window: win });
  return NextResponse.json(res);
}
