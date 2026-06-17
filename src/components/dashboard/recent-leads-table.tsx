import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge, statusVariant, intentVariant } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { RecentLead } from "@/lib/dashboard/types";

function ScorePill({ score }: { score: number | null }) {
  if (score === null) return <span className="text-zinc-600">—</span>;
  const color =
    score >= 70
      ? "text-red-300"
      : score >= 40
      ? "text-orange-300"
      : "text-zinc-400";
  return <span className={`font-semibold tabular-nums ${color}`}>{score}</span>;
}

export function RecentLeadsTable({ leads }: { leads: RecentLead[] }) {
  if (leads.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center text-sm text-zinc-500">
            No leads yet. Leads appear here after calls are processed.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Recent Leads</CardTitle>
        <Link
          href="/dashboard/leads"
          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Score</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Intent</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Next Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-3 font-mono text-xs text-zinc-200">{lead.phoneNumber}</td>
                  <td className="px-4 py-3">
                    <ScorePill score={lead.latestScore} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={intentVariant(lead.latestIntent)}>
                      {lead.latestIntent ?? "—"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(lead.latestStatus)}>
                      {lead.latestStatus ?? "unknown"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 max-w-[200px] truncate text-zinc-400">
                    {lead.nextAction ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">
                    {lead.createdAt.toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/leads/${lead.id}`}
                      className="text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
