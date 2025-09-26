/*
  Warnings:

  - A unique constraint covering the columns `[clientId,name,channel]` on the table `Campaign` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Campaign_clientId_name_channel_key" ON "public"."Campaign"("clientId", "name", "channel");
