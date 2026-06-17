// Outbound call creation via the VAPI REST API.

const VAPI_BASE = "https://api.vapi.ai";

export interface VapiOutboundCallResponse {
  id: string;
  status: string;
  createdAt: string;
}

export interface VapiCallStatusResponse {
  id: string;
  status: string;
  startedAt?: string;
  endedAt?: string;
}

function getCredentials(): { apiKey: string; assistantId: string; phoneNumberId: string } {
  const apiKey = process.env.VAPI_API_KEY;
  const assistantId = process.env.VAPI_ASSISTANT_ID;
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;

  if (!apiKey) throw new Error("VAPI_API_KEY is not set");
  if (!assistantId) throw new Error("VAPI_ASSISTANT_ID is not set");
  if (!phoneNumberId) throw new Error("VAPI_PHONE_NUMBER_ID is not set");

  return { apiKey, assistantId, phoneNumberId };
}

/**
 * Initiates an outbound phone call via VAPI.
 * phoneNumberId is the ID of the VAPI-provisioned caller number (not the customer's number).
 * Returns the VAPI call object on success, throws on failure.
 */
export async function createOutboundCall(
  phoneNumber: string
): Promise<VapiOutboundCallResponse> {
  const { apiKey, assistantId, phoneNumberId } = getCredentials();

  const res = await fetch(`${VAPI_BASE}/call`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      assistantId,
      phoneNumberId,
      customer: { number: phoneNumber },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`VAPI createOutboundCall failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<VapiOutboundCallResponse>;
}

/**
 * Fetches the current status of a VAPI call by its call ID.
 */
export async function getCallStatus(
  callId: string
): Promise<VapiCallStatusResponse> {
  const { apiKey } = getCredentials();

  const res = await fetch(`${VAPI_BASE}/call/${callId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`VAPI getCallStatus failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<VapiCallStatusResponse>;
}

/**
 * Retries a failed call by initiating a new outbound call to the same number.
 * VAPI does not support re-triggering a specific call ID; we create a new call.
 */
export async function retryCall(
  phoneNumber: string
): Promise<VapiOutboundCallResponse> {
  return createOutboundCall(phoneNumber);
}
