import { after } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { processPendingJobs } from "@/lib/services/callQueueWorker";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const lead = await prisma.lead.findUnique({
      where: { id },
      select: { id: true, phoneNumber: true, callAttempts: true },
    });

    if (!lead) {
      return Response.json({ error: "Lead not found" }, { status: 404 });
    }

    // Reset lead status and queue a new call
    await prisma.lead.update({
      where: { id },
      data: { status: "PENDING" },
    });

    await prisma.callQueue.create({
      data: { leadId: id },
    });

    after(() =>
      processPendingJobs().catch((err) =>
        console.error("[/api/dashboard/leads/[id]/retry]", err)
      )
    );

    return Response.json({ queued: true });
  } catch (err) {
    console.error("[/api/dashboard/leads/[id]/retry]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
