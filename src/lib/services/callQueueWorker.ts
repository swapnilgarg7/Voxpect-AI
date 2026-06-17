// Queue worker — processes pending CallQueue entries and initiates VAPI calls.
// Designed to be called from next/server after() so it runs after the HTTP
// response is already sent.

import { prisma } from "@/lib/db/prisma";
import { createOutboundCall } from "./vapiCalling.service";

const MAX_ATTEMPTS = 3;

type QueueJobWithLead = {
  id: string;
  leadId: string;
  attempts: number;
  lead: { id: string; phoneNumber: string };
};

/**
 * Processes all PENDING queue entries (or retries FAILED ones under the
 * attempt ceiling). Each entry is processed independently; a single failure
 * does not abort the rest.
 */
export async function processPendingJobs(): Promise<void> {
  const jobs = await prisma.callQueue.findMany({
    where: {
      OR: [
        { status: "PENDING" },
        { status: "FAILED", attempts: { lt: MAX_ATTEMPTS } },
      ],
    },
    include: { lead: { select: { id: true, phoneNumber: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (jobs.length === 0) return;

  console.info(`[callQueueWorker] Processing ${jobs.length} job(s)`);

  await Promise.allSettled(jobs.map((job) => processJob(job)));
}

async function processJob(job: QueueJobWithLead): Promise<void> {
  const { id: jobId, leadId, attempts } = job;
  const { id: leadDbId, phoneNumber } = job.lead;

  // Mark as PROCESSING
  await prisma.callQueue.update({
    where: { id: jobId },
    data: { status: "PROCESSING", attempts: attempts + 1 },
  });

  await prisma.lead.update({
    where: { id: leadDbId },
    data: { status: "CALLING", lastCallAttempt: new Date() },
  });

  try {
    await createOutboundCall(phoneNumber);

    await prisma.callQueue.update({
      where: { id: jobId },
      data: { status: "SUCCESS", processedAt: new Date() },
    });

    await prisma.lead.update({
      where: { id: leadDbId },
      data: { status: "CALLED", callAttempts: { increment: 1 } },
    });

    console.info(`[callQueueWorker] Call initiated for lead ${leadDbId} (${phoneNumber})`);
  } catch (err) {
    const newAttempts = attempts + 1;
    const isExhausted = newAttempts >= MAX_ATTEMPTS;

    await prisma.callQueue.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        processedAt: new Date(),
      },
    });

    await prisma.lead.update({
      where: { id: leadDbId },
      data: {
        status: isExhausted ? "FAILED" : "PENDING",
        callAttempts: { increment: 1 },
      },
    });

    console.error(
      `[callQueueWorker] Job ${jobId} failed (attempt ${newAttempts}/${MAX_ATTEMPTS}):`,
      err
    );
  }
}
