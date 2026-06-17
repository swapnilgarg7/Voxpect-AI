import { after } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getLeads } from "@/lib/dashboard/queries";
import { processPendingJobs } from "@/lib/services/callQueueWorker";

// ---------------------------------------------------------------------------
// GET — paginated leads list
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(100, parseInt(searchParams.get("pageSize") ?? "20", 10));
    const search = searchParams.get("search") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const intent = searchParams.get("intent") ?? undefined;
    const rawSort = searchParams.get("sortBy");
    const sortBy = rawSort === "score" ? "score" : "date";
    const rawDir = searchParams.get("sortDir");
    const sortDir = rawDir === "asc" ? "asc" : "desc";

    const data = await getLeads({ page, pageSize, search, status, intent, sortBy, sortDir });

    return Response.json(data);
  } catch (err) {
    console.error("[/api/dashboard/leads GET]", err);
    return Response.json({ error: "Failed to load leads" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — create a new lead and queue an outbound call
// ---------------------------------------------------------------------------

// E.164: +[1-9][0-9]{1,14}
const E164_RE = /^\+[1-9]\d{1,14}$/;

const CreateLeadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phoneNumber: z
    .string()
    .regex(E164_RE, "Phone must be in E.164 format (e.g. +14155552671)"),
  company: z.string().optional(),
  industry: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = CreateLeadSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }

    const { name, phoneNumber, company, industry } = parsed.data;

    // Duplicate check
    const existing = await prisma.lead.findUnique({ where: { phoneNumber } });
    if (existing) {
      return Response.json(
        { error: "A lead with this phone number already exists", leadId: existing.id },
        { status: 409 }
      );
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        phoneNumber,
        company: company ?? null,
        industry: industry ?? null,
        status: "PENDING",
      },
    });

    // Enqueue the outbound call job
    await prisma.callQueue.create({
      data: { leadId: lead.id },
    });

    // Trigger worker after response — does not block the API response
    after(() =>
      processPendingJobs().catch((err) =>
        console.error("[/api/dashboard/leads POST] Queue worker error:", err)
      )
    );

    return Response.json({ leadId: lead.id }, { status: 201 });
  } catch (err) {
    console.error("[/api/dashboard/leads POST]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
