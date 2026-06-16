-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calls" (
    "id" TEXT NOT NULL,
    "vapiCallId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "transcript" TEXT,
    "duration" INTEGER,
    "recordingUrl" TEXT,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leads_phoneNumber_key" ON "leads"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "calls_vapiCallId_key" ON "calls"("vapiCallId");

-- CreateIndex
CREATE INDEX "calls_leadId_idx" ON "calls"("leadId");

-- CreateIndex
CREATE INDEX "calls_vapiCallId_idx" ON "calls"("vapiCallId");

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
