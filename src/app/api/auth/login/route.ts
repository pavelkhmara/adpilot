import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../lib/db";

function isCuid(v?: string | null) { return !!v && /^c[a-z0-9]{24,}$/i.test(v); }
const secure = process.env.NODE_ENV === "production";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { key, id, name } = body as { key?: string; id?: string; name?: string };

    let clientId: string | null = null;
    let clientKey: string | null = null;
    let clientName: string | null = null;

    if (isCuid(id || "")) {
      const c = await prisma.client.findUnique({ where: { id }, select: { id: true, key: true, name: true } });
      if (!c) return NextResponse.json({ error: "Client not found" }, { status: 404 });
      clientId = c.id; clientKey = c.key; clientName = c.name;
    } else if (key && typeof key === "string") {
      const c = await prisma.client.upsert({
        where: { key },
        update: {},
        create: { key, name: name || key.toUpperCase() },
        select: { id: true, key: true, name: true },
      });
      clientId = c.id; clientKey = c.key; clientName = c.name;
    } else {
      // быстрый демо-вход без ключа — создадим «временного» клиента
      const randKey = "demo-" + Math.random().toString(36).slice(2, 8);
      const c = await prisma.client.create({
        data: { key: randKey, name: "Demo " + randKey.toUpperCase() },
        select: { id: true, key: true, name: true },
      });
      clientId = c.id; clientKey = c.key; clientName = c.name;
    }

    // Ставим httpOnly куки
    const res = NextResponse.json({ ok: true, clientId, key: clientKey, name: clientName }, { status: 200 });
    (await cookies()).set("clientId", clientId!, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 60 * 60 * 24 * 30 });
    (await cookies()).set("clientKey", clientKey!, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 60 * 60 * 24 * 30 });
    (await cookies()).set("clientName", encodeURIComponent(clientName || ""), { httpOnly: false, sameSite: "lax", secure, path: "/", maxAge: 60 * 60 * 24 * 30 }); // для отображения
    return res;
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
