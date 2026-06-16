// Type definitions for VAPI webhook payloads.
// Based on VAPI API reference: https://docs.vapi.ai/api-reference/webhooks
// We type only what we store; unknown fields are silently ignored.

export type VapiCallStatus =
  | "queued"
  | "ringing"
  | "in-progress"
  | "forwarding"
  | "ended";

export type VapiEndedReason =
  | "assistant-ended-call"
  | "customer-ended-call"
  | "customer-did-not-answer"
  | "customer-busy"
  | "voicemail"
  | "max-duration-exceeded"
  | "pipeline-error"
  | "silence-timed-out"
  | "transfer-failed"
  | string; // allow unknown reasons from future VAPI versions

export interface VapiCustomer {
  number?: string; // E.164 format, e.g. "+14155552671"
  name?: string;
}

export interface VapiCallPayload {
  id: string;
  status: VapiCallStatus;
  type?: string;
  startedAt?: string;   // ISO 8601
  endedAt?: string;     // ISO 8601
  endedReason?: VapiEndedReason;

  duration?: number;

  recordingUrl?: string;

  customer?: VapiCustomer;

  // Outbound calls: the dialed number may appear here instead of customer.number
  to?: string;
  // Inbound calls: caller's number
  from?: string;
  // Phone number object used for the call
  phoneNumber?: { number?: string };

  transcript?: string;

  artifact?: {
    transcript?: string;
    recordingUrl?: string;
  };
}

// Top-level webhook envelope
export interface VapiWebhookEvent {
  message: {
    type: string;           // e.g. "end-of-call-report", "status-update"
    call?: VapiCallPayload;
    // end-of-call-report surfaces call data at the top of message
    startedAt?: string;
    endedAt?: string;
    endedReason?: VapiEndedReason;
    duration?: number;
    recordingUrl?: string;
    transcript?: string;
    artifact?: {
      transcript?: string;
      recordingUrl?: string;
    };
    customer?: VapiCustomer;
  };
}

// Normalised shape after we extract everything we need from the raw payload
export interface NormalisedCallData {
  vapiCallId: string;
  phoneNumber: string;
  transcript: string | null;
  duration: number | null;
  recordingUrl: string | null;
  status: string;
  startedAt: Date | null;
  endedAt: Date | null;
}
