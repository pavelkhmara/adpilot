import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function POST() {
  (await cookies()).delete("clientId");
  (await cookies()).delete("clientKey");
  (await cookies()).delete("clientName");
  NextResponse.json({ ok: true });
  return redirect("/");
}
