import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Phone,
  CheckCircle,
  XCircle,
  Minus,
} from "lucide-react";
import { getLeadDetails } from "@/lib/dashboard/queries";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, statusVariant, intentVariant } from "@/components/ui/badge";
import { CopyButton } from "@/components/dashboard/copy-button";
import { AudioPlayer } from "@/components/dashboard/audio-player";
import { RetryCallButton } from "@/components/dashboard/retry-call-button";

export const dynamic = "force-dynamic";

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-zinc-500">—</span>;
  const color =
    score >= 70 ? "bg-red-500/20 text-red-300" :
    score >= 40 ? "bg-orange-500/20 text-orange-300" :
    "bg-zinc-500/20 text-zinc-400";
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-lg font-bold ${color}`}>
      {score}
    </span>
  );
}

function BoolField({ value }: { value: boolean | null | undefined }) {
  if (value === null || value === undefined) {
    return (
      <span className="flex items-center gap-1.5 text-sm text-zinc-500">
        <Minus className="h-4 w-4" /> Unknown
      </span>
    );
  }
  return value ? (
    <span className="flex items-center gap-1.5 text-sm text-emerald-300">
      <CheckCircle className="h-4 w-4" /> Yes
    </span>
  ) : (
    <span className="flex items-center gap-1.5 text-sm text-zinc-400">
      <XCircle className="h-4 w-4" /> No
    </span>
  );
}

function ClassificationBadge({ status }: { status: string | null }) {
  const s = (status ?? "").toLowerCase();
  if (s === "hot") return (
    <span className="inline-flex items-center rounded-md border border-red-500/40 bg-red-500/20 px-3 py-1 text-sm font-bold text-red-300 uppercase tracking-wide">
      HOT
    </span>
  );
  if (s === "warm") return (
    <span className="inline-flex items-center rounded-md border border-orange-500/40 bg-orange-500/20 px-3 py-1 text-sm font-bold text-orange-300 uppercase tracking-wide">
      WARM
    </span>
  );
  return (
    <span className="inline-flex items-center rounded-md border border-zinc-600/40 bg-zinc-700/30 px-3 py-1 text-sm font-bold text-zinc-400 uppercase tracking-wide">
      COLD
    </span>
  );
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLeadDetails(id);
  if (!lead) notFound();

  const { latestAnalysis: analysis } = lead;

  return (
    <div className="space-y-8">
      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/leads"
            className="flex items-center gap-1 text-sm text-zinc-500 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Leads
          </Link>
          <span className="text-zinc-700">/</span>
          <span className="text-sm text-zinc-300 font-mono">{lead.phoneNumber}</span>
        </div>
        <RetryCallButton leadId={lead.id} />
      </div>

      {/* Section 1 — Lead Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Phone Number</p>
              <p className="font-mono text-sm text-white">{lead.phoneNumber}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Lead Score</p>
              <ScoreBadge score={lead.latestScore} />
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Intent Level</p>
              <Badge variant={intentVariant(lead.latestIntent)}>
                {lead.latestIntent ?? "—"}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Classification</p>
              <Badge variant={statusVariant(lead.latestStatus)}>
                {(lead.latestStatus ?? "unknown").toUpperCase()}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Total Calls</p>
              <p className="text-sm font-semibold text-white">{lead.totalCalls}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2 — Lead Qualification Summary */}
      {analysis ? (
        <Card>
          <CardHeader>
            <CardTitle>Lead Qualification Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Signal grid */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">Decision Maker</p>
                <BoolField value={analysis.decisionMaker} />
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">Active Projects</p>
                <BoolField value={analysis.activeProjects} />
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">Open to Alternatives</p>
                <BoolField value={analysis.openToAlternatives} />
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">Requested Quote</p>
                <BoolField value={analysis.requestedQuote} />
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">Follow-up Requested</p>
                <BoolField value={analysis.followUpRequested} />
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">Follow-up Needed</p>
                <BoolField value={analysis.followupNeeded} />
              </div>
            </div>

            <div className="border-t border-white/5 pt-5 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">Project Stage</p>
                <p className="text-sm text-zinc-200">
                  {analysis.projectStage || <span className="text-zinc-600">Unknown</span>}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">Purchase Timeline</p>
                <p className="text-sm text-zinc-200">
                  {analysis.purchaseTimelineDays !== null
                    ? `${analysis.purchaseTimelineDays} days`
                    : <span className="text-zinc-600">Unknown</span>}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-1">Current Supplier</p>
                <p className="text-sm text-zinc-200">
                  {analysis.currentSupplier || <span className="text-zinc-600">Not disclosed</span>}
                </p>
              </div>
            </div>

            {analysis.materialsNeeded.length > 0 && (
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Materials Required</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.materialsNeeded.map((m, i) => (
                    <span key={i} className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs text-indigo-300">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {analysis.painPoints.length > 0 && (
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Pain Points</p>
                <ul className="space-y-1">
                  {analysis.painPoints.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.objections.length > 0 && (
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Objections</p>
                <ul className="space-y-1">
                  {analysis.objections.map((o, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-400 flex-shrink-0" />
                      {o}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Score + Classification + Action */}
            <div className="border-t border-white/5 pt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-white/5 p-4">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Lead Score</p>
                <p className="text-3xl font-bold text-white">
                  {analysis.leadScore}
                  <span className="text-lg text-zinc-500">/100</span>
                </p>
              </div>
              <div className="rounded-lg bg-white/5 p-4">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Classification</p>
                <ClassificationBadge status={lead.latestStatus} />
              </div>
              <div className="rounded-lg bg-white/5 p-4">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Recommended Action</p>
                <p className="text-sm font-semibold text-white">{analysis.nextAction}</p>
              </div>
            </div>

            {analysis.summary && (
              <div className="border-t border-white/5 pt-5">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Notes</p>
                <p className="text-sm text-zinc-300 leading-relaxed">{analysis.summary}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex h-24 items-center justify-center text-sm text-zinc-500">
            No qualification data available yet.
          </CardContent>
        </Card>
      )}

      {/* Section 3 — AI Follow-up Message */}
      {analysis?.recommendedFollowupMessage && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>AI Generated Follow-up Message</CardTitle>
            <CopyButton text={analysis.recommendedFollowupMessage} />
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
                {analysis.recommendedFollowupMessage}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 4 — Transcript Viewer */}
      {lead.latestTranscript && (
        <Card>
          <CardHeader>
            <CardTitle>Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-72 overflow-y-auto rounded-lg bg-black/30 p-4">
              <pre className="whitespace-pre-wrap text-xs text-zinc-300 font-mono leading-relaxed">
                {lead.latestTranscript}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 5 — Call History */}
      <Card>
        <CardHeader>
          <CardTitle>Call History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {lead.callHistory.length === 0 ? (
            <div className="flex h-20 items-center justify-center text-sm text-zinc-500 px-6">
              No calls recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Duration</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {lead.callHistory.map((call) => (
                    <tr key={call.id} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-3 text-xs text-zinc-300">
                        {(call.startedAt ?? call.createdAt).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400 tabular-nums">
                        {formatDuration(call.duration)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-zinc-400">{call.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        {call.score !== null ? (
                          <span className={`text-xs font-semibold tabular-nums ${
                            call.score >= 70 ? "text-red-300" :
                            call.score >= 40 ? "text-orange-300" : "text-zinc-400"
                          }`}>
                            {call.score}
                          </span>
                        ) : <span className="text-zinc-600">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 6 — Recording Player */}
      {lead.latestRecordingUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Call Recording</CardTitle>
          </CardHeader>
          <CardContent>
            <AudioPlayer url={lead.latestRecordingUrl} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
