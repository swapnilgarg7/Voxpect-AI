export type LeadTemperature = "Hot" | "Warm" | "Cold";
export type IntentLevel = "high" | "medium" | "low";

export interface DashboardMetrics {
  totalCalls: number;
  totalLeads: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  followupsRequired: number;
}

export interface CallsPerDay {
  date: string;
  count: number;
}

export interface ScoreDistributionBucket {
  range: string;
  count: number;
}

export interface TopObjection {
  objection: string;
  count: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
}

export interface RecentLead {
  id: string;
  phoneNumber: string;
  latestScore: number | null;
  latestIntent: string | null;
  latestStatus: string | null;
  nextAction: string | null;
  createdAt: Date;
}

export interface LeadListItem {
  id: string;
  phoneNumber: string;
  latestScore: number | null;
  latestIntent: string | null;
  latestStatus: string | null;
  followupNeeded: boolean | null;
  lastActivityAt: Date;
  createdAt: Date;
}

export interface CallHistoryItem {
  id: string;
  duration: number | null;
  status: string;
  score: number | null;
  startedAt: Date | null;
  createdAt: Date;
}

export interface LeadDetail {
  id: string;
  phoneNumber: string;
  latestScore: number | null;
  latestIntent: string | null;
  latestStatus: string | null;
  totalCalls: number;
  latestAnalysis: {
    summary: string;
    painPoints: string[];
    objections: string[];
    nextAction: string;
    followupNeeded: boolean;
    recommendedFollowupMessage: string;
    interested: boolean;
    leadScore: number;
    intentLevel: string;
    decisionMaker: boolean | null;
    activeProjects: boolean | null;
    projectStage: string | null;
    materialsNeeded: string[];
    purchaseTimelineDays: number | null;
    currentSupplier: string | null;
    openToAlternatives: boolean | null;
    requestedQuote: boolean | null;
    followUpRequested: boolean | null;
  } | null;
  latestTranscript: string | null;
  latestRecordingUrl: string | null;
  callHistory: CallHistoryItem[];
  createdAt: Date;
}

export interface LeadsPageData {
  leads: LeadListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
