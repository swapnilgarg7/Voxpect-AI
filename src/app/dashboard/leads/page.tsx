import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { LeadsTable } from "@/components/dashboard/leads-table";

export default function LeadsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads</h1>
          <p className="mt-1 text-sm text-zinc-500">Search, filter, and manage all your leads</p>
        </div>
        <Link
          href="/dashboard/leads/new"
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Lead
        </Link>
      </div>
      <Suspense fallback={<div className="text-sm text-zinc-500">Loading...</div>}>
        <LeadsTable />
      </Suspense>
    </div>
  );
}
