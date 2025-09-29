import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  (await cookies()).delete("clientId");
  (await cookies()).delete("clientKey");
  (await cookies()).delete("clientName");
  return NextResponse.json({ ok: true });
}
