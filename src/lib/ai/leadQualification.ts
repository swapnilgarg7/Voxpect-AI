import OpenAI from "openai";
import { z } from "zod";

// ---------------------------------------------------------------------------
// AI extraction schema — what OpenAI returns
// ---------------------------------------------------------------------------

const LeadAnalysisAISchema = z.object({
  summary: z.string().min(1),
  objections: z.array(z.string()),
  painPoints: z.array(z.string()),
  followupNeeded: z.boolean(),
  recommendedFollowupMessage: z.string(),
  decisionMaker: z.boolean(),
  activeProjects: z.boolean(),
  projectStage: z.string(),
  materialsNeeded: z.array(z.string()),
  purchaseTimelineDays: z.number().int().nullable(),
  currentSupplier: z.string(),
  openToAlternatives: z.boolean(),
  requestedQuote: z.boolean(),
  followUpRequested: z.boolean(),
});

type LeadAnalysisAIOutput = z.infer<typeof LeadAnalysisAISchema>;

// ---------------------------------------------------------------------------
// Full result including deterministically computed fields
// ---------------------------------------------------------------------------

export interface LeadAnalysisResult extends LeadAnalysisAIOutput {
  leadScore: number;
  intentLevel: "high" | "medium" | "low";
  interested: boolean;
  nextAction: string;
}

// ---------------------------------------------------------------------------
// Scoring and classification
// ---------------------------------------------------------------------------

export type LeadTemperature = "Hot" | "Warm" | "Cold";

export function computeLeadScore(signals: Pick<LeadAnalysisAIOutput,
  "decisionMaker" | "activeProjects" | "purchaseTimelineDays" |
  "openToAlternatives" | "requestedQuote" | "followUpRequested">
): number {
  let score = 0;
  if (signals.decisionMaker) score += 15;
  if (signals.activeProjects) score += 25;
  if (signals.purchaseTimelineDays !== null && signals.purchaseTimelineDays <= 60) score += 25;
  if (signals.openToAlternatives) score += 10;
  if (signals.requestedQuote) score += 15;
  if (signals.followUpRequested) score += 10;
  return score;
}

export function getLeadTemperature(
  score: number,
  signals?: Pick<LeadAnalysisAIOutput, "activeProjects" | "purchaseTimelineDays" | "requestedQuote">
): LeadTemperature {
  // Special HOT override: active project + purchase within 60 days + requested quote
  if (
    signals?.activeProjects &&
    signals.purchaseTimelineDays !== null &&
    signals.purchaseTimelineDays <= 60 &&
    signals.requestedQuote
  ) {
    return "Hot";
  }
  if (score >= 70) return "Hot";
  if (score >= 40) return "Warm";
  return "Cold";
}

function computeNextAction(temperature: LeadTemperature, requestedQuote: boolean): string {
  if (temperature === "Hot") return requestedQuote ? "Send Quote" : "Schedule Sales Call";
  if (temperature === "Warm") return "Schedule Sales Call";
  return "Add To Nurture Campaign";
}

export type LeadPriority = "critical" | "high" | "medium" | "low";

export function calculateLeadPriority(
  score: number,
  intentLevel: "high" | "medium" | "low",
  followupNeeded: boolean
): LeadPriority {
  if (score >= 85 && intentLevel === "high") return "critical";
  if (score >= 70 || intentLevel === "high") return "high";
  if (score >= 40 || intentLevel === "medium") return followupNeeded ? "medium" : "low";
  return "low";
}

// ---------------------------------------------------------------------------
// OpenAI
// ---------------------------------------------------------------------------

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

const SYSTEM_PROMPT = `You are an AI assistant for a construction materials supplier analyzing outbound sales call transcripts.

Extract purchase intent signals from the transcript. Be conservative — only set boolean fields to true when there is clear evidence in the conversation.

Return ONLY valid JSON — no markdown, no explanation:
{
  "summary": "2-3 sentence call summary",
  "objections": ["objections raised by the prospect"],
  "painPoints": ["pain points explicitly mentioned by the prospect"],
  "followupNeeded": boolean (true if any actionable path forward exists),
  "recommendedFollowupMessage": "personalized follow-up message referencing specifics from this call",
  "decisionMaker": boolean (is this person authorized to make purchasing decisions?),
  "activeProjects": boolean (does the prospect have active construction or renovation projects needing materials?),
  "projectStage": "description of the project stage, or empty string if unknown",
  "materialsNeeded": ["specific construction materials mentioned"],
  "purchaseTimelineDays": number or null (estimated days until purchase — e.g. 7, 14, 30, 60, 90 — null if unclear),
  "currentSupplier": "current supplier name/description, or empty string if not mentioned",
  "openToAlternatives": boolean (is the prospect open to switching or trying a new supplier?),
  "requestedQuote": boolean (did the prospect request a quote, pricing, or estimate?),
  "followUpRequested": boolean (did the prospect explicitly ask to be called back or schedule a follow-up?)
}`;

// ---------------------------------------------------------------------------
// Retry
// ---------------------------------------------------------------------------

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3, baseDelayMs = 1000): Promise<T> {
  let lastError: Error = new Error("Unknown error");

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === maxAttempts) break;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      console.warn(
        `[leadQualification] Attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms: ${lastError.message}`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function analyzeTranscript(transcript: string): Promise<LeadAnalysisResult> {
  return withRetry(async () => {
    const response = await getClient().chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Analyze this sales call transcript:\n\n${transcript}` },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("OpenAI returned an empty response");

    let raw: unknown;
    try {
      raw = JSON.parse(content);
    } catch {
      throw new Error(`OpenAI response is not valid JSON: ${content.slice(0, 300)}`);
    }

    const parsed = LeadAnalysisAISchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Schema validation failed: ${parsed.error.message}`);
    }

    const aiData = parsed.data;
    const leadScore = computeLeadScore(aiData);
    const temperature = getLeadTemperature(leadScore, aiData);
    const intentLevel: "high" | "medium" | "low" =
      temperature === "Hot" ? "high" : temperature === "Warm" ? "medium" : "low";
    const interested = leadScore >= 40;
    const nextAction = computeNextAction(temperature, aiData.requestedQuote);

    return { ...aiData, leadScore, intentLevel, interested, nextAction };
  });
}
