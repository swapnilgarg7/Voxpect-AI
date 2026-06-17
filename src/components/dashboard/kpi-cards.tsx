import { Phone, Users, Flame, Sun, Snowflake, Bell } from "lucide-react";
import { Card, CardHeader, CardTitle, CardValue } from "@/components/ui/card";
import type { DashboardMetrics } from "@/lib/dashboard/types";

const kpis = (m: DashboardMetrics) => [
  { label: "Total Calls", value: m.totalCalls, icon: Phone, color: "text-indigo-400" },
  { label: "Total Leads", value: m.totalLeads, icon: Users, color: "text-blue-400" },
  { label: "Hot Leads", value: m.hotLeads, icon: Flame, color: "text-red-400" },
  { label: "Warm Leads", value: m.warmLeads, icon: Sun, color: "text-orange-400" },
  { label: "Cold Leads", value: m.coldLeads, icon: Snowflake, color: "text-zinc-400" },
  { label: "Follow-ups Required", value: m.followupsRequired, icon: Bell, color: "text-yellow-400" },
];

export function KpiCards({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {kpis(metrics).map(({ label, value, icon: Icon, color }) => (
        <Card key={label} className="flex flex-col">
          <CardHeader className="gap-3 p-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs">{label}</CardTitle>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <CardValue className="text-2xl">{value.toLocaleString()}</CardValue>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
