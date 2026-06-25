"use client";

import { useState } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { LeadsTable } from "@/components/dashboard/leads-table";
import { BulkUploadModal } from "@/components/dashboard/bulk-upload-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

function LeadsTableSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <th key={i} className="px-4 py-3 text-left">
                    <Skeleton className="h-3 w-16" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LeadsPage() {
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [tableKey, setTableKey] = useState(0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads</h1>
          <p className="mt-1 text-sm text-zinc-500">Search, filter, and manage all your leads</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setShowBulkUpload(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Bulk Upload</span>
          </button>
          <Link
            href="/dashboard/leads/new"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Lead</span>
          </Link>
        </div>
      </div>

      <Suspense fallback={<LeadsTableSkeleton />}>
        <LeadsTable key={tableKey} />
      </Suspense>

      {showBulkUpload && (
        <BulkUploadModal
          onClose={() => setShowBulkUpload(false)}
          onSuccess={() => {
            setShowBulkUpload(false);
            setTableKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
