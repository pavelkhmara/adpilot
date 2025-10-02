// pacing?: {
//     expectedToDate: number;  // бюджет по плану к текущему дню
//     actualToDate: number;    // фактические траты с начала месяца
//     delta: number;           // actual - expected
//     percent: number;         // actual/expected в %
//     monthBudget?: number | null; // необязательный план месяца, если есть
//     periodStart: string;     // ISO начала месяца
//     periodNow: string;       // ISO "сейчас"

// actualToDate = сумма spend MTD (с первого дня месяца по сейчас).
// expectedToDate =
//   если есть план в CampaignPlanMonthly → monthBudget * (elapsedDays / daysInMonth),
//   иначе, если budgetType='daily' и budgetAmount → daily * elapsedDays,
//   иначе null → возвращаем pacing: null.
// percent = actual/expected * 100, если expected>0, иначе 0.



// import { startOfMonth, differenceInCalendarDays } from 'date-fns';

// function computePacing({
//   monthBudget,
//   dailyBudget,
//   actualMTD,
//   now,
// }: {
//   monthBudget?: number | null;
//   dailyBudget?: number | null;
//   actualMTD: number;
//   now: Date;
// }) {
//   const start = startOfMonth(now);
//   const daysElapsed = Math.max(1, differenceInCalendarDays(now, start) + 1);
//   const daysInMonth = differenceInCalendarDays(
//     new Date(start.getFullYear(), start.getMonth() + 1, 0),
//     new Date(start.getFullYear(), start.getMonth(), 1),
//   ) + 1;

//   let expectedToDate: number | null = null;
//   if (monthBudget && monthBudget > 0) {
//     expectedToDate = (monthBudget * daysElapsed) / daysInMonth;
//   } else if (dailyBudget && dailyBudget > 0) {
//     expectedToDate = dailyBudget * daysElapsed;
//   }

//   if (!expectedToDate || expectedToDate <= 0) {
//     return null;
//   }

//   const delta = actualMTD - expectedToDate;
//   const percent = (actualMTD / expectedToDate) * 100;

//   return {
//     expectedToDate: Number(expectedToDate.toFixed(2)),
//     actualToDate: Number(actualMTD.toFixed(2)),
//     delta: Number(delta.toFixed(2)),
//     percent: Number(percent.toFixed(2)),
//     monthBudget: monthBudget ?? null,
//     periodStart: start.toISOString(),
//     periodNow: now.toISOString(),
//   };
// }


// // внутри сборки ответа по каждой кампании
// const now = new Date();
// const start = startOfMonth(now);

// // 1) фактические траты MTD (если у тебя уже есть агрегатор — переиспользуй)
// const actualMTD = await prisma.campaignMetric.aggregate({
//   _sum: { spend: true },
//   where: {
//     campaignId: c.id,
//     date: { gte: start, lte: now },
//   },
// }).then(r => Number(r._sum.spend ?? 0));

// // 2) план месяца (если есть таблица CampaignPlanMonthly)
// const plan = await prisma.campaignPlanMonthly.findFirst({
//   where: { campaignId: c.id, month: start }, // или другой ключ месяца
//   select: { budgetAmount: true },
// });
// const monthBudget = plan?.budgetAmount ?? null;

// // 3) dailyBudget из самой кампании (если тип daily)
// const dailyBudget = c.budgetType === 'daily' ? Number(c.budgetAmount ?? 0) : null;

// // 4) собрать pacing
// const pacing = computePacing({ monthBudget, dailyBudget, actualMTD, now });

// // 5) вложить в item
// items.push({
//   id: c.id,
//   name: c.name,
//   // ...
//   kpi: { today, d7, d30 },
//   latestRecommendation,
//   pacing,
// });


// import { Badge } from '@/components/ui/badge';
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// const PacingBadge = ({ row }: { row: CampaignRow }) => {
//   if (!row.pacing) return null;

//   const { delta, percent, expectedToDate, actualToDate, monthBudget } = row.pacing;

//   // семафор: >115% — красный, 85–115% — нейтр., <85% — жёлтый (пример)
//   const variant =
//     percent > 115 ? 'destructive' : percent < 85 ? 'secondary' : 'default';

//   const label =
//     percent > 115 ? `+${Math.round(percent - 100)}%`
//     : percent < 85 ? `-${Math.round(100 - percent)}%`
//     : `${Math.round(percent)}%`;

//   return (
//     <TooltipProvider>
//       <Tooltip delayDuration={200}>
//         <TooltipTrigger asChild>
//           <Badge variant={variant} className="tabular-nums">
//             Pacing {label}
//           </Badge>
//         </TooltipTrigger>
//         <TooltipContent side="top">
//           <div className="text-xs leading-tight space-y-1">
//             <div><b>Actual MTD:</b> {actualToDate.toFixed(2)}</div>
//             <div><b>Expected MTD:</b> {expectedToDate.toFixed(2)}</div>
//             <div><b>Delta:</b> {delta.toFixed(2)}</div>
//             {monthBudget ? <div><b>Month plan:</b> {monthBudget.toFixed(2)}</div> : null}
//           </div>
//         </TooltipContent>
//       </Tooltip>
//     </TooltipProvider>
//   );
// };

// // …внутри строки кампании:
// <div className="flex items-center gap-2">
//   <span className="font-medium">{row.name}</span>
//   {/* уже добавленный бейдж latestRec */}
//   {/* новый бейдж пейсинга */}
//   <PacingBadge row={row} />
// </div>