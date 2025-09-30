import { prisma } from "../src/lib/db";

async function main() {
  const all = await prisma.recommendation.count();
  const byClient = await prisma.recommendation.groupBy({
    by: ["clientId"],
    _count: { _all: true },
  });
  console.log("Total recommendations:", all);
  console.log("By clientId:", byClient);

  const sample = await prisma.recommendation.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
  });
  console.log("Sample:", sample.map(x => ({
    id: x.id, clientId: x.clientId, campaignId: x.campaignId, level: x.level, type: x.type
  })));
}

main().finally(()=>process.exit(0));
