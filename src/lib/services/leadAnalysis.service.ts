import { analyzeTranscript, getLeadTemperature } from "@/lib/ai/leadQualification";
import { createLeadAnalysis, findAnalysisByCallId } from "@/lib/db/leadAnalysis";
import { prisma } from "@/lib/db/prisma";

/**
 * Runs AI qualification for a completed call transcript.
 *
 * Designed to be called inside next/server `after()` so it runs after the
 * webhook response is sent — never blocks the HTTP response.
 *
 * Idempotent: silently exits if an analysis for this callId already exists.
 */
export async function runLeadQualification(
  callId: string,
  leadId: string,
  transcript: string
): Promise<void> {
  const existing = await findAnalysisByCallId(callId);
  if (existing) {
    console.info(`[leadAnalysis] Analysis already exists for call ${callId} — skipping`);
    return;
  }

  console.info(`[leadAnalysis] Qualifying call ${callId} for lead ${leadId}`);

  const analysis = await analyzeTranscript(transcript);

  await createLeadAnalysis({ callId, leadId, ...analysis });

  const temperature = getLeadTemperature(analysis.leadScore, analysis);
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      latestScore: analysis.leadScore,
      latestIntent: analysis.intentLevel,
      latestStatus: temperature.toLowerCase(),
    },
  });

  console.info(
    `[leadAnalysis] Done — call=${callId} score=${analysis.leadScore} ` +
      `intent=${analysis.intentLevel} temp=${temperature}`
  );
}
