import { prisma } from "@/lib/db/prisma";
import type {
  DashboardMetrics,
  CallsPerDay,
  ScoreDistributionBucket,
  TopObjection,
  FunnelStage,
  RecentLead,
  LeadListItem,
  LeadDetail,
  LeadsPageData,
} from "./types";

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [totalCalls, leads, followups] = await Promise.all([
    prisma.call.count(),
    prisma.lead.findMany({
      select: { latestScore: true, latestStatus: true },
    }),
    prisma.leadAnalysis.count({ where: { followupNeeded: true } }),
  ]);

  const statusCounts = { hot: 0, warm: 0, cold: 0 };
  for (const lead of leads) {
    const s = (lead.latestStatus ?? "cold").toLowerCase();
    if (s === "hot") statusCounts.hot++;
    else if (s === "warm" || s === "cool") statusCounts.warm++;
    else statusCounts.cold++;
  }

  return {
    totalCalls,
    totalLeads: leads.length,
    hotLeads: statusCounts.hot,
    warmLeads: statusCounts.warm,
    coldLeads: statusCounts.cold,
    followupsRequired: followups,
  };
}

export async function getCallsPerDay(): Promise<CallsPerDay[]> {
  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);

  const calls = await prisma.call.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const map = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    map.set(d.toISOString().slice(0, 10), 0);
  }

  for (const call of calls) {
    const key = call.createdAt.toISOString().slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
}

export async function getLeadScoreDistribution(): Promise<ScoreDistributionBucket[]> {
  const buckets: ScoreDistributionBucket[] = [
    { range: "Hot (70-100)", count: 0 },
    { range: "Warm (40-69)", count: 0 },
    { range: "Cold (0-39)", count: 0 },
  ];

  const leads = await prisma.lead.findMany({
    select: { latestScore: true },
  });

  for (const { latestScore } of leads) {
    const score = latestScore ?? 0;
    if (score >= 70) buckets[0].count++;
    else if (score >= 40) buckets[1].count++;
    else buckets[2].count++;
  }

  return buckets;
}

export async function getTopObjections(): Promise<TopObjection[]> {
  const analyses = await prisma.leadAnalysis.findMany({
    select: { objections: true },
  });

  const counts = new Map<string, number>();
  for (const { objections } of analyses) {
    for (const obj of objections) {
      const key = obj.toLowerCase().trim();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([objection, count]) => ({
      objection: objection.charAt(0).toUpperCase() + objection.slice(1),
      count,
    }));
}

export async function getConversionFunnel(): Promise<FunnelStage[]> {
  const [called, interested, followup] = await Promise.all([
    prisma.call.count(),
    prisma.leadAnalysis.count({ where: { interested: true } }),
    prisma.leadAnalysis.count({ where: { followupNeeded: true } }),
  ]);

  const converted = await prisma.lead.count({
    where: { latestStatus: "hot", latestScore: { gte: 70 } },
  });

  return [
    { stage: "Called", count: called },
    { stage: "Interested", count: interested },
    { stage: "Follow-Up", count: followup },
    { stage: "Converted", count: converted },
  ];
}

export async function getRecentLeads(limit = 10): Promise<RecentLead[]> {
  const leads = await prisma.lead.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      phoneNumber: true,
      latestScore: true,
      latestIntent: true,
      latestStatus: true,
      createdAt: true,
      analyses: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: { nextAction: true },
      },
    },
  });

  return leads.map((l) => ({
    id: l.id,
    phoneNumber: l.phoneNumber,
    latestScore: l.latestScore,
    latestIntent: l.latestIntent,
    latestStatus: l.latestStatus,
    nextAction: l.analyses[0]?.nextAction ?? null,
    createdAt: l.createdAt,
  }));
}

export async function getLeads(opts: {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  intent?: string;
  sortBy?: "score" | "date";
  sortDir?: "asc" | "desc";
}): Promise<LeadsPageData> {
  const { page, pageSize, search, status, intent, sortBy = "date", sortDir = "desc" } = opts;
  const skip = (page - 1) * pageSize;

  const where = {
    ...(search ? { phoneNumber: { contains: search } } : {}),
    ...(status ? { latestStatus: status } : {}),
    ...(intent ? { latestIntent: intent } : {}),
  };

  const orderBy =
    sortBy === "score"
      ? ({ latestScore: sortDir } as const)
      : ({ createdAt: sortDir } as const);

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      skip,
      take: pageSize,
      where,
      orderBy,
      select: {
        id: true,
        phoneNumber: true,
        latestScore: true,
        latestIntent: true,
        latestStatus: true,
        createdAt: true,
        analyses: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { followupNeeded: true, createdAt: true },
        },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  const items: LeadListItem[] = leads.map((l) => ({
    id: l.id,
    phoneNumber: l.phoneNumber,
    latestScore: l.latestScore,
    latestIntent: l.latestIntent,
    latestStatus: l.latestStatus,
    followupNeeded: l.analyses[0]?.followupNeeded ?? null,
    lastActivityAt: l.analyses[0]?.createdAt ?? l.createdAt,
    createdAt: l.createdAt,
  }));

  return {
    leads: items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getLeadDetails(id: string): Promise<LeadDetail | null> {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      analyses: {
        take: 1,
        orderBy: { createdAt: "desc" },
        select: {
          summary: true,
          painPoints: true,
          objections: true,
          nextAction: true,
          followupNeeded: true,
          recommendedFollowupMessage: true,
          interested: true,
          leadScore: true,
          intentLevel: true,
          decisionMaker: true,
          activeProjects: true,
          projectStage: true,
          materialsNeeded: true,
          purchaseTimelineDays: true,
          currentSupplier: true,
          openToAlternatives: true,
          requestedQuote: true,
          followUpRequested: true,
        },
      },
      calls: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          duration: true,
          status: true,
          startedAt: true,
          createdAt: true,
          recordingUrl: true,
          transcript: true,
          analysis: {
            select: { leadScore: true },
          },
        },
      },
    },
  });

  if (!lead) return null;

  const latestCall = lead.calls[0] ?? null;

  return {
    id: lead.id,
    phoneNumber: lead.phoneNumber,
    latestScore: lead.latestScore,
    latestIntent: lead.latestIntent,
    latestStatus: lead.latestStatus,
    totalCalls: lead.calls.length,
    latestAnalysis: lead.analyses[0] ?? null,
    latestTranscript: latestCall?.transcript ?? null,
    latestRecordingUrl: latestCall?.recordingUrl ?? null,
    callHistory: lead.calls.map((c) => ({
      id: c.id,
      duration: c.duration,
      status: c.status,
      score: c.analysis?.leadScore ?? null,
      startedAt: c.startedAt,
      createdAt: c.createdAt,
    })),
    createdAt: lead.createdAt,
  };
}
