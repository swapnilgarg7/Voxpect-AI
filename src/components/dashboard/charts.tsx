"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";
import type { CallsPerDay, ScoreDistributionBucket, FunnelStage } from "@/lib/dashboard/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const TEMP_COLORS = ["#ef4444", "#f97316", "#3b82f6", "#71717a"];

export function CallsPerDayChart({ data }: { data: CallsPerDay[] }) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  const every5 = formatted.filter((_, i) => i % 5 === 0 || i === formatted.length - 1);
  const ticks = every5.map((d) => d.label);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calls Per Day (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={formatted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="label"
              ticks={ticks}
              tick={{ fill: "#71717a", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "#71717a", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ backgroundColor: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
              labelStyle={{ color: "#fff", fontSize: 12 }}
              itemStyle={{ color: "#a5b4fc", fontSize: 12 }}
            />
            <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} name="Calls" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function LeadTemperatureChart({ data }: { data: ScoreDistributionBucket[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Temperature Distribution</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-6">
        <ResponsiveContainer width={180} height={180}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="range"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={TEMP_COLORS[i % TEMP_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
              itemStyle={{ color: "#fff", fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-col gap-2">
          {data.map((d, i) => (
            <div key={d.range} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: TEMP_COLORS[i % TEMP_COLORS.length] }}
              />
              <span className="text-xs text-zinc-400">{d.range}</span>
              <span className="ml-auto text-xs font-semibold text-white tabular-nums">{d.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function LeadScoreDistributionChart({ data }: { data: ScoreDistributionBucket[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Score Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="range" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
              itemStyle={{ color: "#fff", fontSize: 12 }}
            />
            <Bar dataKey="count" radius={[3, 3, 0, 0]} name="Leads">
              {data.map((_, i) => (
                <Cell key={i} fill={TEMP_COLORS[i % TEMP_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ConversionFunnelChart({ data }: { data: FunnelStage[] }) {
  const colors = ["#6366f1", "#8b5cf6", "#a855f7", "#7c3aed"];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.map((stage, i) => {
            const pct = data[0].count > 0 ? (stage.count / data[0].count) * 100 : 0;
            return (
              <div key={stage.stage}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-zinc-400">{stage.stage}</span>
                  <span className="font-semibold text-white tabular-nums">{stage.count}</span>
                </div>
                <div className="h-6 w-full rounded bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: colors[i] }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
