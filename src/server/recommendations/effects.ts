import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../../lib/db";
import { logger } from "../../server/debug/logger";

type Win = "T7" | "T14" | "T30";

function daysFor(win: Win) {
  if (win === "T14") return 14;
  if (win === "T30") return 30;
  return 7;
}

// усредняем “качество” по окну: здесь считаем ROAS = revenue/spend
function roas(sum: { spend: number; revenue: number }) {
  return sum.spend > 0 ? sum.revenue / sum.spend : 0;
}
function sumRows(rows: { spend: Decimal; revenue: Decimal }[]) {
  return rows.reduce(
    (acc, r) => {
      acc.spend += Number(r.spend ?? 0);
      acc.revenue += Number(r.revenue ?? 0);
      return acc;
    },
    { spend: 0, revenue: 0 }
  );
}

export async function measureEffects(opts?: { window?: Win; now?: Date; take?: number }) {
  const win: Win = (opts?.window ?? "T7") as Win;
  const now = opts?.now ?? new Date();
  const take = opts?.take ?? 50;
  const d = daysFor(win);
  
  logger.info("recs.measure", "start", { window: win, take });
  // кандидаты: applied, у которых окно уже прошло, и нет эффекта для этого окна
  const cutoff = new Date(now.getTime() - d * 24 * 3600 * 1000);

  // берём пачку рекомендаций
  const recs = await prisma.recommendation.findMany({
    where: {
      status: "applied",
      // нет уже записанного эффекта на это окно
      effects: { none: { window: win } },
    },
    select: { id: true, clientId: true, campaignId: true },
    take,
  });

  let measured = 0;

  for (const r of recs) {
    // найдём время применения (первое apply-действие)
    const act = await prisma.recommendationAction.findFirst({
      where: { recommendationId: r.id, result: "ok" },
      orderBy: { appliedAt: "asc" },
      select: { appliedAt: true },
    });
    if (!act) continue;

    const appliedAt = act.appliedAt;
    // окно ещё не закончилось — ждать
    if (appliedAt > cutoff) continue;

    // baseline: 7 дней ДО применения
    const baseFrom = new Date(appliedAt.getTime() - 7 * 24 * 3600 * 1000);
    const baseTo = new Date(appliedAt.getTime() - 1 * 24 * 3600 * 1000);

    // outcome: [день применения .. +win дней]
    const outFrom = new Date(appliedAt.getTime());
    const outTo = new Date(appliedAt.getTime() + d * 24 * 3600 * 1000);

    // собираем метрики кампании
    const [baseRows, outRows] = await Promise.all([
      prisma.metricDaily.findMany({
        where: { campaignId: r.campaignId!, date: { gte: baseFrom, lte: baseTo } },
        select: { spend: true, revenue: true },
      }),
      prisma.metricDaily.findMany({
        where: { campaignId: r.campaignId!, date: { gte: outFrom, lte: outTo } },
        select: { spend: true, revenue: true },
      }),
    ]);

    const base = sumRows(baseRows);
    const out = sumRows(outRows);

    const baseline = roas(base);
    const outcome = roas(out);
    const absDelta = outcome - baseline;
    const relDeltaPct = baseline > 0 ? (absDelta / baseline) * 100 : (outcome > 0 ? 100 : 0);

    await prisma.recommendationEffect.upsert({
      where: {
        recommendationId_window: { recommendationId: r.id, window: win }, // предполагаем @@unique([recommendationId, window])
      },
      create: {
        recommendationId: r.id,
        window: win,
        kpi: "ROAS",
        // baseline: String(baseline),
        // outcome: String(outcome),
        observedDeltaAbs: absDelta,
        observedDeltaRel: relDeltaPct,
        measuredAt: baseFrom,
        // baselineTo: baseTo,
        // outcomeFrom: outFrom,
        // outcomeTo: outTo,
        source: "blended",
      },
      update: {
        // baseline: String(baseline),
        // outcome: String(outcome),
        observedDeltaAbs: absDelta,
        observedDeltaRel: relDeltaPct,
        // baselineFrom: baseFrom,
        // baselineTo: baseTo,
        // outcomeFrom: outFrom,
        // outcomeTo: outTo,
        measuredAt: now,
        source: "blended",
      },
    });

    measured++;
  }
  
  logger.info("recs.measure", "measured", { window: win, count: measured });
  return { ok: true as const, window: win, measured };
}
