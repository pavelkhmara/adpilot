import { NextRequest, NextResponse } from "next/server";
import { importCsvForClient } from "../../../server/import/service";
import { ClientId } from "../../../lib/types";
import { prisma } from "../../../lib/db";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const isCuid = (v?: string | null) => !!v && /^c[a-z0-9]{24,}$/i.test(v);

function toClientId(v: string | null): ClientId | null {
  switch (v) {
    case "acme":
    case "orbit":
    case "nova":
    case "zen":
      return v;
    default:
      return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const cookieClientId = (await cookies()).get("clientId")?.value || null;
    const clientParam = toClientId(form.get("client")?.toString() ?? null) ?? cookieClientId;
    const file = form.get("file");

    if (!clientParam) {
      return NextResponse.json(
        { error: "Field 'client' is required (?client=<key> or cuid)" },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Field 'file' is required and must be a CSV file" },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "Empty file" }, { status: 400 });
    }

    const clientId = isCuid(clientParam)
      ? clientParam
      : (await prisma.client.findUnique({ where: { key: clientParam }, select: { id: true } }))?.id;

    if (!clientId) {
      return NextResponse.json({ error: `client '${clientParam}' not found` }, { status: 404 });
    }

    const { campaignsCreated, metricRowsUpserted } = await importCsvForClient(clientId, file);
    return NextResponse.json(
      { ok: true, campaignsCreated, metricRowsUpserted },
      { status: 200 }
    );

  } catch (e) {
    console.error("POST /api/import error:", e);
    const msg = e instanceof Error ? e.message : "Import failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
