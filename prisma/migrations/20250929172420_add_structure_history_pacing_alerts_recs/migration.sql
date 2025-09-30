/*
  Warnings:

  - You are about to drop the column `actionType` on the `Recommendation` table. All the data in the column will be lost.
  - You are about to drop the column `entityId` on the `Recommendation` table. All the data in the column will be lost.
  - You are about to drop the column `entityType` on the `Recommendation` table. All the data in the column will be lost.
  - You are about to drop the column `payload` on the `Recommendation` table. All the data in the column will be lost.
  - You are about to drop the column `priority` on the `Recommendation` table. All the data in the column will be lost.
  - The `status` column on the `Recommendation` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `actionPayload` to the `Recommendation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `channel` to the `Recommendation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `Recommendation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `confidence` to the `Recommendation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdBy` to the `Recommendation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expectedKpi` to the `Recommendation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `horizon` to the `Recommendation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `level` to the `Recommendation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priorityScore` to the `Recommendation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Recommendation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `urgency` to the `Recommendation` table without a default value. This is not possible if the table is not empty.
  - Made the column `reason` on table `Recommendation` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "public"."RecLevel" AS ENUM ('campaign', 'adset', 'ad', 'creative');

-- CreateEnum
CREATE TYPE "public"."RecStatus" AS ENUM ('proposed', 'applied', 'dismissed', 'expired', 'failed');

-- CreateEnum
CREATE TYPE "public"."RecKpi" AS ENUM ('CPA', 'ROAS', 'Spend', 'Conv');

-- CreateEnum
CREATE TYPE "public"."RecUrgency" AS ENUM ('low', 'med', 'high');

-- CreateEnum
CREATE TYPE "public"."RecCreatedBy" AS ENUM ('rule', 'ml', 'human');

-- CreateEnum
CREATE TYPE "public"."ActionResult" AS ENUM ('ok', 'error');

-- CreateEnum
CREATE TYPE "public"."EffectWindow" AS ENUM ('T7', 'T14', 'T30');

-- CreateEnum
CREATE TYPE "public"."EffectSource" AS ENUM ('platform', 'blended');

-- CreateEnum
CREATE TYPE "public"."AlertSeverity" AS ENUM ('info', 'warn', 'critical');

-- DropForeignKey
ALTER TABLE "public"."Recommendation" DROP CONSTRAINT "Recommendation_campaignId_fkey";

-- DropIndex
DROP INDEX "public"."Recommendation_campaignId_priority_createdAt_idx";

-- DropIndex
DROP INDEX "public"."Recommendation_campaignId_status_idx";

-- AlterTable
ALTER TABLE "public"."Recommendation" DROP COLUMN "actionType",
DROP COLUMN "entityId",
DROP COLUMN "entityType",
DROP COLUMN "payload",
DROP COLUMN "priority",
ADD COLUMN     "actionPayload" JSONB NOT NULL,
ADD COLUMN     "adId" TEXT,
ADD COLUMN     "adSetId" TEXT,
ADD COLUMN     "channel" TEXT NOT NULL,
ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "confidence" DECIMAL(3,2) NOT NULL,
ADD COLUMN     "createdBy" "public"."RecCreatedBy" NOT NULL,
ADD COLUMN     "creativeId" TEXT,
ADD COLUMN     "expectedDeltaAbs" DECIMAL(18,4),
ADD COLUMN     "expectedDeltaRel" DECIMAL(6,4),
ADD COLUMN     "expectedKpi" "public"."RecKpi" NOT NULL,
ADD COLUMN     "explanation" TEXT,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "freshnessAt" TIMESTAMPTZ,
ADD COLUMN     "horizon" "public"."EffectWindow" NOT NULL,
ADD COLUMN     "level" "public"."RecLevel" NOT NULL,
ADD COLUMN     "priorityScore" DECIMAL(8,2) NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL,
ADD COLUMN     "urgency" "public"."RecUrgency" NOT NULL,
ADD COLUMN     "validUntil" TIMESTAMPTZ,
ALTER COLUMN "campaignId" DROP NOT NULL,
ALTER COLUMN "reason" SET NOT NULL,
ALTER COLUMN "reason" SET DATA TYPE TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "public"."RecStatus" NOT NULL DEFAULT 'proposed';

-- CreateTable
CREATE TABLE "public"."AdSet" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "AdSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Ad" (
    "id" TEXT NOT NULL,
    "adSetId" TEXT NOT NULL,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "Ad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Creative" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "type" TEXT NOT NULL,
    "hash" TEXT,
    "landingUrl" TEXT,
    "utm" TEXT,
    "thumbnailRef" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Creative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CampaignSettingsHistory" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "validFrom" TIMESTAMPTZ NOT NULL,
    "validTo" TIMESTAMPTZ,
    "data" JSONB NOT NULL,
    "changedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignSettingsHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CampaignEvent" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ts" TIMESTAMPTZ NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CampaignPlanMonthly" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "plannedSpend" DECIMAL(18,2) NOT NULL,
    "plannedConv" INTEGER,
    "plannedRoas" DECIMAL(8,2),

    CONSTRAINT "CampaignPlanMonthly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PacingSnapshot" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "expectedSpendToDate" DECIMAL(18,2) NOT NULL,
    "actualSpendToDate" DECIMAL(18,2) NOT NULL,
    "delta" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "PacingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Alert" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "severity" "public"."AlertSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMPTZ,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecommendationAction" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "appliedBy" TEXT NOT NULL,
    "appliedAt" TIMESTAMPTZ NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestPayload" JSONB NOT NULL,
    "sourceResponse" JSONB,
    "result" "public"."ActionResult" NOT NULL,
    "errorMessage" TEXT,
    "rollbackHint" TEXT,

    CONSTRAINT "RecommendationAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecommendationEffect" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "window" "public"."EffectWindow" NOT NULL,
    "kpi" "public"."RecKpi" NOT NULL,
    "observedDeltaAbs" DECIMAL(18,4) NOT NULL,
    "observedDeltaRel" DECIMAL(6,4) NOT NULL,
    "measuredAt" TIMESTAMPTZ NOT NULL,
    "source" "public"."EffectSource" NOT NULL,

    CONSTRAINT "RecommendationEffect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecommendationConflict" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "conflictsWithId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "RecommendationConflict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecommendationGuard" (
    "id" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "cooldownUntil" TIMESTAMPTZ,
    "dailyDeltaLimitAbs" DECIMAL(18,2),
    "dailyDeltaLimitRel" DECIMAL(6,4),
    "isAutoAllowed" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RecommendationGuard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdSet_campaignId_status_idx" ON "public"."AdSet"("campaignId", "status");

-- CreateIndex
CREATE INDEX "Ad_adSetId_status_idx" ON "public"."Ad"("adSetId", "status");

-- CreateIndex
CREATE INDEX "CampaignSettingsHistory_campaignId_validFrom_idx" ON "public"."CampaignSettingsHistory"("campaignId", "validFrom");

-- CreateIndex
CREATE INDEX "CampaignEvent_campaignId_ts_idx" ON "public"."CampaignEvent"("campaignId", "ts");

-- CreateIndex
CREATE INDEX "CampaignPlanMonthly_month_idx" ON "public"."CampaignPlanMonthly"("month");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignPlanMonthly_campaignId_month_key" ON "public"."CampaignPlanMonthly"("campaignId", "month");

-- CreateIndex
CREATE INDEX "PacingSnapshot_date_idx" ON "public"."PacingSnapshot"("date");

-- CreateIndex
CREATE UNIQUE INDEX "PacingSnapshot_campaignId_date_key" ON "public"."PacingSnapshot"("campaignId", "date");

-- CreateIndex
CREATE INDEX "Alert_campaignId_severity_createdAt_idx" ON "public"."Alert"("campaignId", "severity", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationAction_idempotencyKey_key" ON "public"."RecommendationAction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "RecommendationAction_recommendationId_appliedAt_idx" ON "public"."RecommendationAction"("recommendationId", "appliedAt");

-- CreateIndex
CREATE INDEX "RecommendationEffect_measuredAt_idx" ON "public"."RecommendationEffect"("measuredAt");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationEffect_recommendationId_window_key" ON "public"."RecommendationEffect"("recommendationId", "window");

-- CreateIndex
CREATE INDEX "RecommendationConflict_recommendationId_idx" ON "public"."RecommendationConflict"("recommendationId");

-- CreateIndex
CREATE INDEX "RecommendationConflict_conflictsWithId_idx" ON "public"."RecommendationConflict"("conflictsWithId");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationGuard_scopeKey_key" ON "public"."RecommendationGuard"("scopeKey");

-- CreateIndex
CREATE INDEX "RecommendationGuard_cooldownUntil_idx" ON "public"."RecommendationGuard"("cooldownUntil");

-- CreateIndex
CREATE INDEX "Recommendation_clientId_status_idx" ON "public"."Recommendation"("clientId", "status");

-- CreateIndex
CREATE INDEX "Recommendation_clientId_priorityScore_createdAt_idx" ON "public"."Recommendation"("clientId", "priorityScore", "createdAt");

-- CreateIndex
CREATE INDEX "Recommendation_channel_level_idx" ON "public"."Recommendation"("channel", "level");

-- CreateIndex
CREATE INDEX "Recommendation_validUntil_idx" ON "public"."Recommendation"("validUntil");

-- CreateIndex
CREATE INDEX "Recommendation_freshnessAt_idx" ON "public"."Recommendation"("freshnessAt");

-- AddForeignKey
ALTER TABLE "public"."Recommendation" ADD CONSTRAINT "Recommendation_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Recommendation" ADD CONSTRAINT "Recommendation_adSetId_fkey" FOREIGN KEY ("adSetId") REFERENCES "public"."AdSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Recommendation" ADD CONSTRAINT "Recommendation_adId_fkey" FOREIGN KEY ("adId") REFERENCES "public"."Ad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdSet" ADD CONSTRAINT "AdSet_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ad" ADD CONSTRAINT "Ad_adSetId_fkey" FOREIGN KEY ("adSetId") REFERENCES "public"."AdSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CampaignSettingsHistory" ADD CONSTRAINT "CampaignSettingsHistory_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CampaignEvent" ADD CONSTRAINT "CampaignEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CampaignPlanMonthly" ADD CONSTRAINT "CampaignPlanMonthly_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PacingSnapshot" ADD CONSTRAINT "PacingSnapshot_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Alert" ADD CONSTRAINT "Alert_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecommendationAction" ADD CONSTRAINT "RecommendationAction_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "public"."Recommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecommendationEffect" ADD CONSTRAINT "RecommendationEffect_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "public"."Recommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecommendationConflict" ADD CONSTRAINT "RecommendationConflict_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "public"."Recommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecommendationConflict" ADD CONSTRAINT "RecommendationConflict_conflictsWithId_fkey" FOREIGN KEY ("conflictsWithId") REFERENCES "public"."Recommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
