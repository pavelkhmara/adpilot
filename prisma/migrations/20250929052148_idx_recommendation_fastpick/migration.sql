-- CreateIndex
CREATE INDEX "Recommendation_campaignId_status_idx" ON "public"."Recommendation"("campaignId", "status");

-- CreateIndex
CREATE INDEX "Recommendation_campaignId_priority_createdAt_idx" ON "public"."Recommendation"("campaignId", "priority", "createdAt");
