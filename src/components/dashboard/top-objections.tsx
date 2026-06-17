import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { TopObjection } from "@/lib/dashboard/types";

export function TopObjectionsCard({ objections }: { objections: TopObjection[] }) {
  const max = objections[0]?.count ?? 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Objections</CardTitle>
      </CardHeader>
      <CardContent>
        {objections.length === 0 ? (
          <p className="text-sm text-zinc-500">No objections recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {objections.map(({ objection, count }) => (
              <div key={objection} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-300">{objection}</span>
                  <span className="font-semibold text-white tabular-nums">{count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                    style={{ width: `${(count / max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
