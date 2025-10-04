-- AlterTable
ALTER TABLE "Connection" ADD COLUMN     "rateLimitInfo" JSONB,
ADD COLUMN     "rateLimitUntil" TIMESTAMP(3),
ADD COLUMN     "tokenRefreshedAt" TIMESTAMP(3);
