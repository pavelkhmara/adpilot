-- CreateTable
CREATE TABLE "public"."Client" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Campaign" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "clientId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT[],

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MetricDaily" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "impressions" INTEGER NOT NULL,
    "clicks" INTEGER NOT NULL,
    "spend" DECIMAL(18,2) NOT NULL,
    "conversions" INTEGER NOT NULL,
    "revenue" DECIMAL(18,2) NOT NULL,
    "frequency" DECIMAL(6,2) NOT NULL,
    "ctr" DECIMAL(6,4) NOT NULL,

    CONSTRAINT "MetricDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_key_key" ON "public"."Client"("key");

-- CreateIndex
CREATE INDEX "Campaign_clientId_channel_idx" ON "public"."Campaign"("clientId", "channel");

-- CreateIndex
CREATE INDEX "Campaign_name_idx" ON "public"."Campaign"("name");

-- CreateIndex
CREATE INDEX "MetricDaily_date_idx" ON "public"."MetricDaily"("date");

-- CreateIndex
CREATE UNIQUE INDEX "MetricDaily_campaignId_date_key" ON "public"."MetricDaily"("campaignId", "date");

-- AddForeignKey
ALTER TABLE "public"."Campaign" ADD CONSTRAINT "Campaign_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MetricDaily" ADD CONSTRAINT "MetricDaily_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
