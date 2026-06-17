// Route handler: POST /api/vapi/webhook
// Kept intentionally thin — all logic lives in the service layer.

import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import {
  verifyWebhookToken,
  processVapiWebhook,
} from "@/lib/services/vapi.service";
import { runLeadQualification } from "@/lib/services/leadAnalysis.service";
import type { VapiWebhookEvent } from "@/lib/types/vapi";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Authenticate via ?token= query param (VAPI doesn't sign payloads)
  if (!verifyWebhookToken(req.nextUrl.searchParams)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  let event: VapiWebhookEvent;
  try {
    event = await req.json() as VapiWebhookEvent;
  } catch {
    console.error("[vapi/webhook] Body is not valid JSON");
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // 3. Only process call-completion events — ack everything else so VAPI
  //    doesn't keep retrying status-update or other event types.
  const eventType = event?.message?.type;
  if (eventType !== "end-of-call-report") {
    console.info(`[vapi/webhook] Ignoring event type: ${eventType}`);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // Log the full payload so we can inspect the exact shape VAPI sends.
  // Remove this once phone number extraction is confirmed working.
  console.log("[vapi/webhook] end-of-call-report payload:", JSON.stringify(event, null, 2));

  // 4. Process
  try {
    const result = await processVapiWebhook(event);

    if (!result.ok) {
      console.error(`[vapi/webhook] Processing failed: ${result.reason}`);
      // 422 = permanently bad payload, don't retry
      return NextResponse.json({ error: result.reason }, { status: 422 });
    }

    // Schedule AI qualification after response is sent — never blocks webhook ack
    if (result.created && result.transcript) {
      after(() =>
        runLeadQualification(result.callId, result.leadId, result.transcript!).catch(
          (err) => console.error("[vapi/webhook] Lead qualification failed:", err)
        )
      );
    }

    return NextResponse.json(
      { received: true, callId: result.callId, created: result.created },
      { status: 200 }
    );
  } catch (err) {
    // 500 = transient error, VAPI will retry
    console.error("[vapi/webhook] Unexpected error:", err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
