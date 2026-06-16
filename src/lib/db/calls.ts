// Database layer — all Prisma queries for Lead and Call models live here.
// Service logic must NOT import Prisma directly; it goes through this module.

import type { Lead, Call } from "@prisma/client";
import { prisma } from "./prisma";
import type { NormalisedCallData } from "@/lib/types/vapi";

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

/**
 * Returns an existing Lead by phone number, or creates one atomically.
 * upsert with an empty `update` means "create if absent, otherwise return as-is".
 */
export async function upsertLeadByPhone(phoneNumber: string): Promise<Lead> {
  return prisma.lead.upsert({
    where: { phoneNumber },
    create: { phoneNumber },
    update: {},
  });
}

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------

/**
 * Persists a completed call.  Returns the newly created record.
 * Throws if vapiCallId already exists (unique constraint) — the caller is
 * responsible for handling idempotency (VAPI may replay webhooks).
 */
export async function createCall(
  data: NormalisedCallData & { leadId: string }
): Promise<Call> {
  return prisma.call.create({
    data: {
      vapiCallId: data.vapiCallId,
      leadId: data.leadId,
      transcript: data.transcript,
      duration: data.duration,
      recordingUrl: data.recordingUrl,
      status: data.status,
      startedAt: data.startedAt,
      endedAt: data.endedAt,
    },
  });
}

/**
 * Looks up a call by VAPI call id.  Used for idempotency checks.
 */
export async function findCallByVapiId(
  vapiCallId: string
): Promise<Call | null> {
  return prisma.call.findUnique({ where: { vapiCallId } });
}
