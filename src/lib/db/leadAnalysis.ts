import type { LeadAnalysis } from "@prisma/client";
import { prisma } from "./prisma";
import type { LeadAnalysisResult } from "@/lib/ai/leadQualification";

export interface CreateLeadAnalysisInput extends LeadAnalysisResult {
  callId: string;
  leadId: string;
}

export async function createLeadAnalysis(
  data: CreateLeadAnalysisInput
): Promise<LeadAnalysis> {
  return prisma.leadAnalysis.create({
    data: {
      callId: data.callId,
      leadId: data.leadId,
      interested: data.interested,
      leadScore: data.leadScore,
      intentLevel: data.intentLevel,
      summary: data.summary,
      objections: data.objections,
      painPoints: data.painPoints,
      nextAction: data.nextAction,
      followupNeeded: data.followupNeeded,
      recommendedFollowupMessage: data.recommendedFollowupMessage,
      decisionMaker: data.decisionMaker,
      activeProjects: data.activeProjects,
      projectStage: data.projectStage,
      materialsNeeded: data.materialsNeeded,
      purchaseTimelineDays: data.purchaseTimelineDays,
      currentSupplier: data.currentSupplier,
      openToAlternatives: data.openToAlternatives,
      requestedQuote: data.requestedQuote,
      followUpRequested: data.followUpRequested,
    },
  });
}

export async function findAnalysisByCallId(
  callId: string
): Promise<LeadAnalysis | null> {
  return prisma.leadAnalysis.findUnique({ where: { callId } });
}
