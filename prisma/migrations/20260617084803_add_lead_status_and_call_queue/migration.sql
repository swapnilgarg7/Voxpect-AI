-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('PENDING', 'CALLING', 'CALLED', 'FAILED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "callAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "company" TEXT,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "lastCallAttempt" TIMESTAMP(3),
ADD COLUMN     "name" TEXT,
ADD COLUMN     "status" "LeadStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "call_queue" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "status" "QueueStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "call_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "call_queue_leadId_idx" ON "call_queue"("leadId");

-- CreateIndex
CREATE INDEX "call_queue_status_idx" ON "call_queue"("status");

-- AddForeignKey
ALTER TABLE "call_queue" ADD CONSTRAINT "call_queue_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
