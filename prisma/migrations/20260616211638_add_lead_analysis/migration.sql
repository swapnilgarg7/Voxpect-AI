-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "latestIntent" TEXT,
ADD COLUMN     "latestScore" INTEGER,
ADD COLUMN     "latestStatus" TEXT;

-- CreateTable
CREATE TABLE "lead_analyses" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "interested" BOOLEAN NOT NULL,
    "leadScore" INTEGER NOT NULL,
    "intentLevel" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "nextAction" TEXT NOT NULL,
    "objections" TEXT[],
    "painPoints" TEXT[],
    "followupNeeded" BOOLEAN NOT NULL,
    "recommendedFollowupMessage" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lead_analyses_callId_key" ON "lead_analyses"("callId");

-- CreateIndex
CREATE INDEX "lead_analyses_leadId_idx" ON "lead_analyses"("leadId");

-- AddForeignKey
ALTER TABLE "lead_analyses" ADD CONSTRAINT "lead_analyses_callId_fkey" FOREIGN KEY ("callId") REFERENCES "calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_analyses" ADD CONSTRAINT "lead_analyses_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
