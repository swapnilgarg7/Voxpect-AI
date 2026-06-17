"use client";

import { useState } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { LeadsTable } from "@/components/dashboard/leads-table";
import { BulkUploadModal } from "@/components/dashboard/bulk-upload-modal";

export default function LeadsPage() {
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [tableKey, setTableKey] = useState(0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads</h1>
          <p className="mt-1 text-sm text-zinc-500">Search, filter, and manage all your leads</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBulkUpload(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Upload className="h-4 w-4" />
            Bulk Upload
          </button>
          <Link
            href="/dashboard/leads/new"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Lead
          </Link>
        </div>
      </div>

      <Suspense fallback={<div className="text-sm text-zinc-500">Loading...</div>}>
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
