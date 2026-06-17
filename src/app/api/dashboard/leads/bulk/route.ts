import { after } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { processPendingJobs } from "@/lib/services/callQueueWorker";

const E164_RE = /^\+[1-9]\d{1,14}$/;

const BulkLeadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phoneNumber: z
    .string()
    .regex(E164_RE, "Phone must be in E.164 format (e.g. +14155552671)"),
  company: z.string().optional(),
  industry: z.string().optional(),
});

const BulkBodySchema = z.array(BulkLeadSchema).min(1).max(500);

export type BulkLeadResult =
  | { status: "created"; leadId: string; phoneNumber: string }
  | { status: "duplicate"; leadId: string; phoneNumber: string }
  | { status: "error"; phoneNumber: string; reason: string };

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BulkBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const results: BulkLeadResult[] = [];
  let anyCreated = false;

  // Process each lead independently — one failure doesn't stop the rest
  for (const row of parsed.data) {
    const { name, phoneNumber, company, industry } = row;

    try {
      const existing = await prisma.lead.findUnique({ where: { phoneNumber } });

      if (existing) {
        results.push({ status: "duplicate", leadId: existing.id, phoneNumber });
        continue;
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

      await prisma.callQueue.create({ data: { leadId: lead.id } });

      results.push({ status: "created", leadId: lead.id, phoneNumber });
      anyCreated = true;
    } catch (err) {
      results.push({
        status: "error",
        phoneNumber,
        reason: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  if (anyCreated) {
    after(() =>
      processPendingJobs().catch((err) =>
        console.error("[/api/dashboard/leads/bulk] Queue worker error:", err)
      )
    );
  }

  const created = results.filter((r) => r.status === "created").length;
  const duplicates = results.filter((r) => r.status === "duplicate").length;
  const errors = results.filter((r) => r.status === "error").length;

  return Response.json({ created, duplicates, errors, results }, { status: 200 });
}
