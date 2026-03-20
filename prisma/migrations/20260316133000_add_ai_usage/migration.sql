CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "analysisId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "tokensUsed" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiUsage_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "WeeklyAnalysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "AiUsage_analysisId_createdAt_idx" ON "AiUsage"("analysisId", "createdAt");
CREATE INDEX "AiUsage_createdAt_idx" ON "AiUsage"("createdAt");
