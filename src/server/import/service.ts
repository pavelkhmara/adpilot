import { prisma } from "../../lib/db";
import Papa from "papaparse";

type CsvRow = {
  date: string;
  campaign: string;
  channel: string;
  impressions: string | number;
  clicks: string | number;
  spend: string | number;
  conversions: string | number;
  revenue: string | number;
  frequency?: string | number;
  ctr?: string | number;
};

const toNum = (v: unknown) => {
  if (v == null || v === "") return 0;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export async function importCsvForClient(clientId: string, file: File) {
  const text = await file.text();

  const parsed = Papa.parse<CsvRow>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim(),
    transform: v => (typeof v === "string" ? v.trim() : v),
  });

  if (parsed.errors.length) {
    throw new Error(parsed.errors.map(e => e.message).join("; "));
  }

  let campaignsCreated = 0;
  let metricRowsUpserted = 0;

  await prisma.$transaction(async tx => {
    for (const row of parsed.data) {
      const name = row.campaign?.toString().trim();
      const channel = row.channel?.toString().trim();
      const dateStr = row.date?.toString().trim();

      if (!name || !channel || !dateStr) continue;

      let campaign = await tx.campaign.findFirst({ where: { clientId, name, channel }, select: { id: true } });
      if (!campaign) {
        campaign = await tx.campaign.create({
          data: { clientId, name, channel, status: "Active", notes: [] },
          select: { id: true },
        });
        campaignsCreated++;
      }

      const impressions = toNum(row.impressions);
      const clicks = toNum(row.clicks);
      const spend = toNum(row.spend);
      const conversions = toNum(row.conversions);
      const revenue = toNum(row.revenue);
      const frequency = toNum(row.frequency);
      const ctr = row.ctr != null ? toNum(row.ctr) : (impressions > 0 ? clicks / impressions : 0);

      await tx.metricDaily.upsert({
        where: { campaignId_date: { campaignId: campaign.id, date: new Date(dateStr) } },
        update: { impressions, clicks, spend, conversions, revenue, frequency, ctr },
        create: {
          campaignId: campaign.id,
          date: new Date(dateStr),
          impressions, clicks, spend, conversions, revenue, frequency, ctr,
        },
      });
      metricRowsUpserted++;
    }
  });

  return { campaignsCreated, metricRowsUpserted };
}


// import { prisma } from "../../lib/db";
// import Papa from "papaparse";
// import { Prisma } from "@prisma/client";

// type Row = {
//   date: string;
//   campaign: string;
//   channel: "Google Ads" | "Meta Ads";
//   impressions?: string | number;
//   clicks?: string | number;
//   spend?: string | number;
//   conversions?: string | number;
//   revenue?: string | number;
//   frequency?: string | number;
//   ctr?: string | number;
// };

// const isCuid = (v?: string | null) => !!v && /^c[a-z0-9]{24,}$/i.test(v);

// /** Возвращает реальный id клиента (cuid). Если передан ключ (например, "acme"),
//  * найдёт по unique полю Client.key и при отсутствии создаст клиента. */
// export async function ensureClientId(clientParam: string): Promise<string> {
//   if (isCuid(clientParam)) {
//     // валидация, что такой клиент есть
//     const existing = await prisma.client.findUnique({
//       where: { id: clientParam },
//       select: { id: true },
//     });
//     if (!existing) throw new Error(`Client id ${clientParam} not found`);
//     return existing.id;
//   }

//   // это ключ/slug клиента (например "acme") — ищем или создаём
//   const row = await prisma.client.upsert({
//     where: { key: clientParam },
//     update: {},
//     create: { key: clientParam, name: clientParam.toUpperCase() },
//     select: { id: true },
//   });
//   return row.id;
// }

// // export async function importCsvForClient(clientParam: string, csvText: string) {
// //   const { data, errors } = Papa.parse<Row>(csvText, {
// //     header: true,
// //     skipEmptyLines: true,
// //     dynamicTyping: true,
// //     transformHeader: (h) => h.trim(),
// //   });
// //   if (errors?.length) throw new Error(`CSV parse errors: ${errors.map(e => e.message).join("; ")}`);

// //   const clientId = await ensureClientId(clientParam); // <- критично

// //   return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
// //     for (const sample of data) {
// //       // 1) ищем кампанию у этого клиента по имени+каналу (подгони поля под свои уникальные правила)
// //       const existing = await tx.campaign.findFirst({
// //         where: {
// //           name: sample.campaign,
// //           channel: sample.channel,
// //           clientId: clientId,
// //         },
// //         select: { id: true },
// //       });

// //       const campaignId =
// //         existing?.id ??
// //         (
// //           await tx.campaign.create({
// //             data: {
// //               name: sample.campaign,
// //               channel: sample.channel,
// //               status: "Active",
// //               client: { connect: { id: clientId } }, // <-- вместо clientId напрямую
// //             },
// //             select: { id: true },
// //           })
// //         ).id;

// //       // 3) метрики — как у тебя было (привязка по campaignId)
// //       await tx.metricDaily.create({
// //         data: {
// //           campaignId,
// //           date: new Date(sample.date),
// //           impressions: sample.impressions,
// //           clicks: sample.clicks,
// //           spend: sample.spend,
// //           conversions: sample.conversions,
// //           revenue: sample.revenue,
// //           frequency: sample.frequency,
// //           ctr: sample.ctr,
// //         },
// //       });
// //     }

// //     return { imported: data.length };
// //   });
// // }
// export async function importCsvForClient(clientParam: string, file: File) {
//   const text = await file.text();
//   const parsed = Papa.parse<Row>(text.trim(), { header: true, skipEmptyLines: true, dynamicTyping: true, });
//   if (parsed.errors?.length) {
//     throw new Error(`CSV parse error: ${parsed.errors.map(e => e.message).join("; ")}`);
//   }
//   const rows = parsed.data.filter(r => r.date && r.campaign && r.channel) as Row[];

//   const groups = new Map<string, Row[]>();
//   for (const r of rows) {
//     const key = `${r.channel}::${r.campaign}`;
//     const arr = groups.get(key) ?? [];
//     arr.push(r); groups.set(key, arr);
//   }

//   let campaignsCreated = 0;
//   let metricRowsUpserted = 0;

//   const clientId = await ensureClientId(clientParam);

//   await prisma.$transaction(async (tx) => {
//     for (const [, list] of groups) {
//       const sample = list[0];

//       // 1) проверяем, есть ли такая кампания
//         const existing = await tx.campaign.findUnique({
//             where: { clientId_name_channel: { clientId, name: sample.campaign, channel: sample.channel } },
//             select: { id: true },
//         });

//         // 2) если нет — создаём и увеличиваем счётчик
//         const campaignId =
//             existing?.id ??
//             (
//             await tx.campaign.create({
//                 data: {
//                   name: sample.campaign,
//                   channel: sample.channel,
//                   status: "Active",
//                   client: { connect: { id: clientId } }, // <-- безопасная связь
//                 },
//                 select: { id: true },
//               })
//             ).id;

//         if (!existing) campaignsCreated++;

//         // 3) апсерты метрик
//       for (const r of list) {
//         const date = new Date(r.date + "T00:00:00Z");
//         await tx.metricDaily.upsert({
//             where: { campaignId_date: { campaignId, date } },
//             create: {
//                 campaignId,
//                 date,
//                 impressions: toNum(r.impressions),
//                 clicks: toNum(r.clicks),
//                 spend: toNum(r.spend),
//                 conversions: toNum(r.conversions),
//                 revenue: toNum(r.revenue),
//                 frequency: toNum(r.frequency),
//                 ctr: toNum(r.ctr),
//             },
//             update: {
//                 impressions: toNum(r.impressions),
//                 clicks: toNum(r.clicks),
//                 spend: toNum(r.spend),
//                 conversions: toNum(r.conversions),
//                 revenue: toNum(r.revenue),
//                 frequency: toNum(r.frequency),
//                 ctr: toNum(r.ctr),
//             },
//         });
//         metricRowsUpserted++;
//       }
//     }
//   });

//   return { campaignsCreated, metricRowsUpserted };
// }

// function toNum(v: unknown): number {
//   if (typeof v === "number") return v;
//   if (typeof v === "string") {
//     const s = v.replace(",", ".").trim();
//     const n = Number(s);
//     return Number.isFinite(n) ? n : 0;
//   }
//   return 0;
// }
