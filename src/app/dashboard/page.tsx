import {
  getDashboardMetrics,
  getCallsPerDay,
  getLeadScoreDistribution,
  getTopObjections,
  getConversionFunnel,
  getRecentLeads,
} from "@/lib/dashboard/queries";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { RecentLeadsTable } from "@/components/dashboard/recent-leads-table";
import { TopObjectionsCard } from "@/components/dashboard/top-objections";
import {
  CallsPerDayChart,
  LeadTemperatureChart,
  LeadScoreDistributionChart,
  ConversionFunnelChart,
} from "@/components/dashboard/charts";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [metrics, callsPerDay, scoreDistribution, topObjections, funnel, recentLeads] =
    await Promise.all([
      getDashboardMetrics(),
      getCallsPerDay(),
      getLeadScoreDistribution(),
      getTopObjections(),
      getConversionFunnel(),
      getRecentLeads(10),
    ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="mt-1 text-sm text-zinc-500">SDR performance dashboard</p>
      </div>

      <KpiCards metrics={metrics} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CallsPerDayChart data={callsPerDay} />
        <LeadTemperatureChart data={scoreDistribution} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LeadScoreDistributionChart data={scoreDistribution} />
        </div>
        <ConversionFunnelChart data={funnel} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentLeadsTable leads={recentLeads} />
        </div>
        <TopObjectionsCard objections={topObjections} />
      </div>
    </div>
  );
}
