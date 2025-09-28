import { prisma } from "../src/lib/db";
(async () => {
  const { _count } = await prisma.campaign.aggregate({ _count: true });
  console.log(JSON.stringify({ ok: true, campaigns: _count }));
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
