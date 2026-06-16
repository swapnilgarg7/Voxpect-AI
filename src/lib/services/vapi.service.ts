// Service layer — orchestrates webhook processing.
// Keeps route handlers thin and makes this logic independently testable.

import type { VapiWebhookEvent, NormalisedCallData } from "@/lib/types/vapi";
import { upsertLeadByPhone, createCall, findCallByVapiId } from "@/lib/db/calls";

// ---------------------------------------------------------------------------
// Request authentication
// ---------------------------------------------------------------------------

/**
 * VAPI does not currently sign webhook payloads, so we cannot verify a shared
 * secret.  Instead we authenticate by checking that the request carries a
 * static Bearer token we generate and embed in the webhook URL registered in
 * the VAPI dashboard, e.g.:
 *
 *   https://yourdomain.com/api/vapi/webhook?token=<VAPI_WEBHOOK_TOKEN>
 *
 * If VAPI_WEBHOOK_TOKEN is not set the check is skipped (useful in local dev).
 */
export function verifyWebhookToken(searchParams: URLSearchParams): boolean {
  const expected = process.env.VAPI_WEBHOOK_TOKEN;

  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      console.error("[vapi] VAPI_WEBHOOK_TOKEN is not set in production — rejecting request");
      return false;
    }
    console.warn("[vapi] VAPI_WEBHOOK_TOKEN not set; skipping auth (dev only)");
    return true;
  }

  const provided = searchParams.get("token");
  if (!provided) {
    console.error("[vapi] Webhook request missing ?token query param");
    return false;
  }

  // Constant-time comparison to prevent timing attacks even on simple tokens
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return require("crypto").timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Payload normalisation
// ---------------------------------------------------------------------------

/**
 * VAPI places call metadata in two different shapes depending on the event type:
 *  - `end-of-call-report`: fields live directly on `message`
 *  - `status-update`:       fields live on `message.call`
 *
 * This function flattens both shapes into a single NormalisedCallData object.
 * Returns null if the payload cannot be normalised (missing required fields).
 */
export function normalisePayload(
  event: VapiWebhookEvent
): NormalisedCallData | null {
  const { message } = event;

  // Resolve call-level fields from either location
  const call = message.call;
  const vapiCallId = call?.id;
  if (!vapiCallId) {
    console.error("[vapi] Webhook payload missing call.id — cannot store");
    return null;
  }

  // VAPI places the phone number in different fields depending on call direction:
  //   outbound: call.customer.number OR call.to
  //   inbound:  call.customer.number OR call.from
  //   some versions: message.customer.number or call.phoneNumber.number
  //   web/direct calls from the VAPI dashboard have no phone number at all —
  //   we fall back to a synthetic identifier so the call is still stored.
  const phoneNumber =
    call?.customer?.number ??
    message.customer?.number ??
    call?.to ??
    call?.from ??
    call?.phoneNumber?.number ??
    `direct-${vapiCallId}`;

  // Transcript may appear at message level (end-of-call-report) or inside artifact
  const transcript =
    message.transcript ??
    message.artifact?.transcript ??
    call?.transcript ??
    call?.artifact?.transcript ??
    null;

  const recordingUrl =
    message.recordingUrl ??
    message.artifact?.recordingUrl ??
    call?.recordingUrl ??
    call?.artifact?.recordingUrl ??
    null;

  const rawStartedAt = message.startedAt ?? call?.startedAt;
  const rawEndedAt   = message.endedAt   ?? call?.endedAt;
  const rawDuration  = message.duration  ?? call?.duration;

  return {
    vapiCallId,
    phoneNumber,
    transcript,
    duration:     rawDuration  != null ? Math.round(rawDuration) : null,
    recordingUrl,
    status:       call?.status ?? "ended",
    startedAt:    rawStartedAt ? new Date(rawStartedAt) : null,
    endedAt:      rawEndedAt   ? new Date(rawEndedAt)   : null,
  };
}

// ---------------------------------------------------------------------------
// Main orchestration
// ---------------------------------------------------------------------------

export type ProcessResult =
  | { ok: true; callId: string; leadId: string; created: boolean }
  | { ok: false; reason: string };

/**
 * Core pipeline:
 *  1. Normalise the raw VAPI event
 *  2. Idempotency check — skip if we've already stored this call
 *  3. Upsert the Lead
 *  4. Create the Call record
 */
export async function processVapiWebhook(
  event: VapiWebhookEvent
): Promise<ProcessResult> {
  const data = normalisePayload(event);
  if (!data) {
    return { ok: false, reason: "payload_normalisation_failed" };
  }

  // Idempotency: VAPI can replay webhooks; reject duplicates gracefully
  const existing = await findCallByVapiId(data.vapiCallId);
  if (existing) {
    console.info(`[vapi] Duplicate webhook for call ${data.vapiCallId} — ignoring`);
    return { ok: true, callId: existing.id, leadId: existing.leadId, created: false };
  }

  const lead = await upsertLeadByPhone(data.phoneNumber);
  const call = await createCall({ ...data, leadId: lead.id });

  console.info(
    `[vapi] Stored call ${call.id} (vapiCallId=${data.vapiCallId}) for lead ${lead.id}`
  );

  return { ok: true, callId: call.id, leadId: lead.id, created: true };
}
