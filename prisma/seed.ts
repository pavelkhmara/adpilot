import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const clients = [
    { key: "acme",  name: "Acme Store", k: 1.0, prefix: "" },
    { key: "orbit", name: "Orbit Gear", k: 0.7, prefix: "OR - " },
    { key: "nova",  name: "Nova Beauty", k: 1.4, prefix: "NV - " },
    { key: "zen",   name: "Zen Home", k: 0.9, prefix: "ZN - " },
  ];

  const base = [
    { channel:"Google Ads", name:"Brand Search PL", status:"Active", spend:1240.50, clicks:3200, impressions:120000, conversions:96, revenue:7420, frequency:1.2, ctr:0.026, notes:["Stable ROAS","Low CPA"] },
    { channel:"Meta Ads",   name:"Prospecting - Lookalike 1%", status:"Active", spend:2100.00, clicks:5100, impressions:390000, conversions:58, revenue:5200, frequency:2.7, ctr:0.013, notes:["Fatigue risk: high freq","ROAS below target"] },
    { channel:"Google Ads", name:"Performance Max EU", status:"Learning", spend:3120.00, clicks:4200, impressions:210000, conversions:72, revenue:6100, frequency:1.1, ctr:0.020, notes:["In Learning","Give 3-5 days"] },
    { channel:"Meta Ads",   name:"Retargeting 30d", status:"Active", spend:780.00,  clicks:2200, impressions:54000,  conversions:85, revenue:6900, frequency:1.8, ctr:0.041, notes:["High ROAS","Scale opportunity"] },
  ];

  const today = new Date();
  const days = 30;

  for (const c of clients) {
    const client = await prisma.client.upsert({
      where: { key: c.key },
      create: { key: c.key, name: c.name },
      update: {},
    });

    for (const b of base) {
      const camp = await prisma.campaign.create({
        data: {
          clientId: client.id,
          channel: b.channel,
          name: c.prefix + b.name,
          status: b.status,
          notes: b.notes,
        },
      });
      for (let d = days - 1; d >= 0; d--) {
        const date = new Date(Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate() - d,
        ));
        const k = c.k * (1 + (Math.random() - 0.5) * 0.08);

        await prisma.metricDaily.create({
          data: {
            campaignId: camp.id,
            date, 
            impressions: Math.max(0, Math.round(b.impressions * k / days)),
            clicks: Math.max(0, Math.round(b.clicks * k / days)),
            spend: Number((b.spend * k / days).toFixed(2)),    
            conversions: Math.max(0, Math.round(b.conversions * k / days)),
            revenue: Number((b.revenue * k / days).toFixed(2)),
            frequency: Number((b.frequency * (k > 1 ? 1.05 : 0.95)).toFixed(2)),
            ctr: Number((Math.min(0.15, Math.max(0.005, b.ctr * (k > 1 ? 0.95 : 1.05)))).toFixed(4)),
          },
        });
      }
    }
  }
}

main().then(() => {
  console.log("Seed OK");
  process.exit(0);
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
