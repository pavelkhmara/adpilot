import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = {
  date: string;
  campaign: string;
  channel: "Google Ads" | "Meta Ads";
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  revenue: number;
  frequency?: number;
  ctr?: number;
};

function parseCsv(text: string): Row[] {
  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  const sep = firstLine.includes(";") && !firstLine.includes(",") ? ";" : ",";
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);

  const header = lines[0].split(sep).map(h => h.trim().toLowerCase());
  const idx = (name: string) => header.findIndex(h => h === name);

  const need = ["date","campaign","channel","impressions","clicks","spend","conversions","revenue"];
  for (const n of need) if (idx(n) < 0) throw new Error(`Header missing: "${n}"`);

  const optIdx = { frequency: idx("frequency"), ctr: idx("ctr") };

  const toNum = (s: string) => Number(String(s).replace(/\s/g,"").replace(",", ".")) || 0;

  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.trim().replace(/^"|"$/g,""));
    if (cols.length === 1 && cols[0] === "") continue;

    const get = (j: number) => (j >= 0 ? cols[j] : "");
    const row: Row = {
      date: get(idx("date")),
      campaign: get(idx("campaign")),
      channel: get(idx("channel")) as Row["channel"],
      impressions: toNum(get(idx("impressions"))),
      clicks: toNum(get(idx("clicks"))),
      spend: toNum(get(idx("spend"))),
      conversions: toNum(get(idx("conversions"))),
      revenue: toNum(get(idx("revenue"))),
    };
    if (optIdx.frequency >= 0) row.frequency = toNum(get(optIdx.frequency));
    if (optIdx.ctr >= 0) row.ctr = toNum(get(optIdx.ctr));
    rows.push(row);
  }
  return rows;
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const clientKey = String(form.get("client") || "");
    const file = form.get("file") as File | null;
    if (!clientKey) return NextResponse.json({ error: "client required" }, { status: 400 });
    if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

    const client = await prisma.client.findUnique({ where: { key: clientKey } });
    if (!client) return NextResponse.json({ error: `client "${clientKey}" not found` }, { status: 404 });

    const text = await file.text();
    const rows = parseCsv(text);

    // сгруппируем строки по (channel+campaign)
    const mapKey = (r: Row) => `${r.channel}__${r.campaign}`;
    const groups = new Map<string, Row[]>();
    for (const r of rows) {
      const k = mapKey(r);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(r);
    }

    // подгрузим уже существующие кампании клиента в Map
    const existing = await prisma.campaign.findMany({
      where: { clientId: client.id },
      select: { id: true, name: true, channel: true },
    });
    const existingMap = new Map<string, { id: string }>();
    for (const c of existing) existingMap.set(`${c.channel}__${c.name}`, { id: c.id });

    let campaignsCreated = 0;
    let metricRowsUpserted = 0;

    // обрабатываем группы последовательно (без интерактивной транзакции)
    for (const [, gr] of groups) {
      const sample = gr[0];
      const key = mapKey(sample);

      // получаем/создаём кампанию
      let campaignId: string | undefined = existingMap.get(key)?.id;

      if (!campaignId) {
        const found = await prisma.campaign.findFirst({
          where: { clientId: client.id, name: sample.campaign, channel: sample.channel },
          select: { id: true },
        });

        if (found) {
          campaignId = found.id;
          existingMap.set(key, { id: found.id });
        } else {
          const created = await prisma.campaign.create({
            data: {
              clientId: client.id,
              name: sample.campaign,
              channel: sample.channel,
              status: "Active",
              notes: [],
            },
            select: { id: true },
          });
          campaignId = created.id;
          existingMap.set(key, { id: created.id });
          campaignsCreated++;
        }
      }

      // теперь upsert дневных метрик по уникальному (campaignId, date)
      for (const r of gr) {
        const date = new Date(r.date + "T00:00:00Z");
        await prisma.metricDaily.upsert({
          where: { campaignId_date: { campaignId: campaignId!, date } },
          update: {
            impressions: r.impressions,
            clicks: r.clicks,
            spend: r.spend,
            conversions: r.conversions,
            revenue: r.revenue,
            frequency: r.frequency ?? 0,
            ctr: r.ctr ?? (r.impressions > 0 ? r.clicks / r.impressions : 0),
          },
          create: {
            campaignId: campaignId!,
            date,
            impressions: r.impressions,
            clicks: r.clicks,
            spend: r.spend,
            conversions: r.conversions,
            revenue: r.revenue,
            frequency: r.frequency ?? 0,
            ctr: r.ctr ?? (r.impressions > 0 ? r.clicks / r.impressions : 0),
          },
        });
        metricRowsUpserted++;
      }
    }

    return NextResponse.json({
      ok: true,
      client: clientKey,
      campaignsCreated,
      metricRowsUpserted,
    });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("POST /api/import error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
