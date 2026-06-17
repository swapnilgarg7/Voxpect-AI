import {
  getDashboardMetrics,
  getCallsPerDay,
  getLeadScoreDistribution,
  getTopObjections,
  getConversionFunnel,
  getRecentLeads,
} from "@/lib/dashboard/queries";

export async function GET() {
  try {
    const [metrics, callsPerDay, scoreDistribution, topObjections, funnel, recentLeads] =
      await Promise.all([
        getDashboardMetrics(),
        getCallsPerDay(),
        getLeadScoreDistribution(),
        getTopObjections(),
        getConversionFunnel(),
        getRecentLeads(10),
      ]);

    return Response.json({ metrics, callsPerDay, scoreDistribution, topObjections, funnel, recentLeads });
  } catch (err) {
    console.error("[/api/dashboard/metrics]", err);
    return Response.json({ error: "Failed to load metrics" }, { status: 500 });
  }
}
