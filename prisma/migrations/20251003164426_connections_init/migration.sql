-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ConnectionStatus" ADD VALUE 'needs_reauth';
ALTER TYPE "ConnectionStatus" ADD VALUE 'syncing';
ALTER TYPE "ConnectionStatus" ADD VALUE 'error';
ALTER TYPE "ConnectionStatus" ADD VALUE 'not_connected';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Provider" ADD VALUE 'TIKTOK';
ALTER TYPE "Provider" ADD VALUE 'LINKEDIN';
ALTER TYPE "Provider" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "Connection" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "lastSyncAt" TIMESTAMP(3),
ADD COLUMN     "scopes" TEXT[],
ADD COLUMN     "tokenData" JSONB;

-- CreateTable
CREATE TABLE "ConnectedAccount" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "externalAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "lastImportedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectedAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConnectedAccount_connectionId_idx" ON "ConnectedAccount"("connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedAccount_connectionId_externalAccountId_key" ON "ConnectedAccount"("connectionId", "externalAccountId");

-- AddForeignKey
ALTER TABLE "ConnectedAccount" ADD CONSTRAINT "ConnectedAccount_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "Connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
