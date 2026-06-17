-- AlterTable
ALTER TABLE "lead_analyses" ADD COLUMN     "activeProjects" BOOLEAN,
ADD COLUMN     "currentSupplier" TEXT,
ADD COLUMN     "decisionMaker" BOOLEAN,
ADD COLUMN     "followUpRequested" BOOLEAN,
ADD COLUMN     "materialsNeeded" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "openToAlternatives" BOOLEAN,
ADD COLUMN     "projectStage" TEXT,
ADD COLUMN     "purchaseTimelineDays" INTEGER,
ADD COLUMN     "requestedQuote" BOOLEAN;
