"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, ArrowUpDown, ChevronLeft, ChevronRight, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge, statusVariant, intentVariant } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { LeadsPageData } from "@/lib/dashboard/types";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function LeadsTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [intent, setIntent] = useState(searchParams.get("intent") ?? "");
  const [sortBy, setSortBy] = useState<"score" | "date">(
    (searchParams.get("sortBy") as "score" | "date") ?? "date"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">(
    (searchParams.get("sortDir") as "asc" | "desc") ?? "desc"
  );
  const [page, setPage] = useState(parseInt(searchParams.get("page") ?? "1", 10));

  const [data, setData] = useState<LeadsPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const buildUrl = useCallback(
    (overrides: Record<string, string | number> = {}) => {
      const p = new URLSearchParams();
      if (debouncedSearch) p.set("search", debouncedSearch);
      if (status) p.set("status", status);
      if (intent) p.set("intent", intent);
      p.set("sortBy", sortBy);
      p.set("sortDir", sortDir);
      p.set("page", String(page));
      Object.entries(overrides).forEach(([k, v]) => p.set(k, String(v)));
      return p.toString();
    },
    [debouncedSearch, status, intent, sortBy, sortDir, page]
  );

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, intent, sortBy, sortDir]);

  useEffect(() => {
    const qs = buildUrl();
    router.replace(`${pathname}?${qs}`, { scroll: false });

    setLoading(true);
    setError(null);

    fetch(`/api/dashboard/leads?${qs}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch");
        return r.json() as Promise<LeadsPageData>;
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Unknown error");
        setLoading(false);
      });
  }, [buildUrl, pathname, router]);

  const toggleSort = (field: "score" | "date") => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
          <Input
            className="pl-8"
            placeholder="Search name, company, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Temperatures</option>
          <option value="hot">Hot</option>
          <option value="warm">Warm</option>
          <option value="cold">Cold</option>
        </Select>
        <Select value={intent} onChange={(e) => setIntent(e.target.value)}>
          <option value="">All Intent Levels</option>
          <option value="high">High Intent</option>
          <option value="medium">Medium Intent</option>
          <option value="low">Low Intent</option>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {error ? (
            <div className="flex h-32 items-center justify-center text-sm text-red-400">
              {error}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Contact</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Company</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Industry</th>
                      <th className="px-4 py-3 text-left">
                        <button
                          onClick={() => toggleSort("score")}
                          className="flex items-center gap-1 text-xs font-medium text-zinc-500 uppercase tracking-wide hover:text-white transition-colors"
                        >
                          Score <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Intent</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Follow Up</th>
                      <th className="px-4 py-3 text-left">
                        <button
                          onClick={() => toggleSort("date")}
                          className="flex items-center gap-1 text-xs font-medium text-zinc-500 uppercase tracking-wide hover:text-white transition-colors"
                        >
                          Last Activity <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loading
                      ? Array.from({ length: 8 }).map((_, i) => (
                          <tr key={i}>
                            {Array.from({ length: 8 }).map((_, j) => (
                              <td key={j} className="px-4 py-3">
                                <Skeleton className="h-4 w-24" />
                              </td>
                            ))}
                          </tr>
                        ))
                      : data?.leads.length === 0
                      ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center text-sm text-zinc-500">
                            No leads found matching your filters.
                          </td>
                        </tr>
                      )
                      : data?.leads.map((lead) => (
                          <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors cursor-pointer">
                            <td className="px-6 py-3">
                              <Link href={`/dashboard/leads/${lead.id}`} className="block">
                                <span className="block text-sm font-medium text-white hover:text-indigo-300 transition-colors">
                                    {lead.name || lead.phoneNumber}
                                  </span>
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-sm text-zinc-300">
                              {lead.company ?? <span className="text-zinc-600">—</span>}
                            </td>
                            <td className="px-4 py-3 text-xs text-zinc-400">
                              {lead.industry ?? <span className="text-zinc-600">—</span>}
                            </td>
                            <td className="px-4 py-3">
                              {lead.latestScore !== null ? (
                                <span className={`font-semibold tabular-nums ${
                                  lead.latestScore >= 70 ? "text-red-300" :
                                  lead.latestScore >= 40 ? "text-orange-300" : "text-zinc-400"
                                }`}>
                                  {lead.latestScore}
                                </span>
                              ) : <span className="text-zinc-600">—</span>}
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
                            <td className="px-4 py-3">
                              {lead.followupNeeded ? (
                                <span className="flex items-center gap-1 text-yellow-400 text-xs">
                                  <Bell className="h-3 w-3" /> Yes
                                </span>
                              ) : (
                                <span className="text-zinc-600 text-xs">No</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-zinc-500">
                              {new Date(lead.lastActivityAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data && data.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-white/5 px-6 py-3">
                  <span className="text-xs text-zinc-500">
                    Showing {(data.page - 1) * data.pageSize + 1}–
                    {Math.min(data.page * data.pageSize, data.total)} of {data.total}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={data.page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-zinc-400">
                      {data.page} / {data.totalPages}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={data.page >= data.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
