import { cookies } from "next/headers";
import { prisma } from "../../../../lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        let clientId = req.headers.get("x-client-id");
        if (!clientId) {
            clientId = (await cookies()).get("clientId")?.value ?? null;
            if (!clientId) return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
        }

        const rows = await prisma.connection.findMany({
            where: { clientId },
            orderBy: { createdAt: "asc" },
            select: {
                id: true,
                provider: true,
                status: true,
                scopes: true,
                expiresAt: true,
                lastSyncAt: true,
                lastError: true,
                accounts: {
                    orderBy: { createdAt: "asc" },
                    select: {
                        id: true,
                        externalAccountId: true,
                        name: true,
                        currency: true,
                        timezone: true,
                        lastImportedAt: true,
                        isActive: true,
                    },
                },
            },
        });


        return NextResponse.json({ items: rows }, { status: 200 });
    } catch (e: unknown) {
        const err = e instanceof Error ? e : new Error(String(e));
        return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 });
    }
}