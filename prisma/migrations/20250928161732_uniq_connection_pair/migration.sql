/*
  Warnings:

  - A unique constraint covering the columns `[clientId,provider]` on the table `Connection` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Connection_clientId_provider_key" ON "public"."Connection"("clientId", "provider");
