-- CreateEnum
CREATE TYPE "public"."Provider" AS ENUM ('GOOGLE_ADS', 'META_ADS', 'GA4');

-- CreateEnum
CREATE TYPE "public"."ConnectionMode" AS ENUM ('demo', 'live');

-- CreateEnum
CREATE TYPE "public"."ConnectionStatus" AS ENUM ('disconnected', 'connected');

-- AlterTable
ALTER TABLE "public"."Campaign" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "public"."Client" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "public"."Connection" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "provider" "public"."Provider" NOT NULL,
    "status" "public"."ConnectionStatus" NOT NULL DEFAULT 'disconnected',
    "mode" "public"."ConnectionMode" NOT NULL DEFAULT 'demo',
    "externalAccountRef" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Connection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Connection_clientId_provider_idx" ON "public"."Connection"("clientId", "provider");

-- AddForeignKey
ALTER TABLE "public"."Connection" ADD CONSTRAINT "Connection_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
