"use client";

import { useCallback, useRef, useState } from "react";
import { read as xlsxRead, utils as xlsxUtils } from "xlsx";
import { Upload, X, CheckCircle2, AlertCircle, Copy, Loader2, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParsedRow {
  name: string;
  phoneNumber: string;
  company?: string;
  industry?: string;
}

interface RowError {
  row: number;
  phoneNumber: string;
  name: string;
  reason: string;
}

type UploadResult = {
  created: number;
  duplicates: number;
  errors: number;
  results: Array<
    | { status: "created"; leadId: string; phoneNumber: string }
    | { status: "duplicate"; leadId: string; phoneNumber: string }
    | { status: "error"; phoneNumber: string; reason: string }
  >;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const E164_RE = /^\+[1-9]\d{1,14}$/;

function normalizeHeader(h: unknown): string {
  return String(h ?? "")
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function parseRows(raw: Record<string, unknown>[]): { rows: ParsedRow[]; errors: RowError[] } {
  const rows: ParsedRow[] = [];
  const errors: RowError[] = [];

  raw.forEach((r, idx) => {
    // Map flexible header names → canonical fields
    const keys = Object.fromEntries(
      Object.entries(r).map(([k, v]) => [normalizeHeader(k), v])
    );

    const name = String(keys["name"] ?? keys["fullname"] ?? keys["contactname"] ?? "").trim();
    const rawPhone = String(
      keys["phonenumber"] ?? keys["phone"] ?? keys["mobile"] ?? keys["tel"] ?? ""
    ).trim();
    const company = String(keys["company"] ?? keys["companyname"] ?? keys["organization"] ?? "").trim() || undefined;
    const industry = String(keys["industry"] ?? keys["sector"] ?? "").trim() || undefined;

    if (!name) {
      errors.push({ row: idx + 2, phoneNumber: rawPhone, name: "(missing)", reason: "Name is required" });
      return;
    }

    // Normalize: strip whitespace/dashes/parens, then prepend + if missing
    const digitsOnly = rawPhone.replace(/[\s\-().]/g, "");
    const phone = digitsOnly.startsWith("+") ? digitsOnly : `+${digitsOnly}`;

    if (!E164_RE.test(phone)) {
      errors.push({
        row: idx + 2,
        phoneNumber: rawPhone || "(missing)",
        name,
        reason: "Phone must include a country code (e.g. 919876543210 or +919876543210)",
      });
      return;
    }

    rows.push({ name, phoneNumber: phone, company, industry });
  });

  return { rows, errors };
}

function parseCSV(text: string): Record<string, unknown>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
  });
}

function parseExcel(buffer: ArrayBuffer): Record<string, unknown>[] {
  const wb = xlsxRead(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return xlsxUtils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "idle" | "preview" | "uploading" | "done";

export function BulkUploadModal({ onClose, onSuccess }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("idle");
  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseErrors, setParseErrors] = useState<RowError[]>([]);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        let raw: Record<string, unknown>[];
        if (file.name.endsWith(".csv")) {
          raw = parseCSV(e.target?.result as string);
        } else {
          raw = parseExcel(e.target?.result as ArrayBuffer);
        }

        if (raw.length === 0) {
          setParseErrors([{ row: 1, phoneNumber: "", name: "", reason: "File is empty or has no data rows" }]);
          setParsedRows([]);
          setStep("preview");
          return;
        }

        const { rows, errors } = parseRows(raw);
        setParsedRows(rows);
        setParseErrors(errors);
        setStep("preview");
      } catch (err) {
        setParseErrors([{
          row: 0,
          phoneNumber: "",
          name: "",
          reason: `Failed to parse file: ${err instanceof Error ? err.message : String(err)}`,
        }]);
        setParsedRows([]);
        setStep("preview");
      }
    };

    if (file.name.endsWith(".csv")) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleUpload = async () => {
    if (parsedRows.length === 0) return;
    setStep("uploading");
    setUploadError(null);

    try {
      const res = await fetch("/api/dashboard/leads/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedRows),
      });

      const data = (await res.json()) as UploadResult & { error?: string };

      if (!res.ok) {
        setUploadError(data.error ?? "Upload failed");
        setStep("preview");
        return;
      }

      setResult(data);
      setStep("done");
      onSuccess();
    } catch {
      setUploadError("Network error — please try again");
      setStep("preview");
    }
  };

  const reset = () => {
    setStep("idle");
    setFileName("");
    setParsedRows([]);
    setParseErrors([]);
    setResult(null);
    setUploadError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-white">Bulk Upload Leads</h2>
            <p className="mt-0.5 text-xs text-zinc-500">Upload a CSV or Excel file — each lead will be queued for an outbound call</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Step: idle — drop zone */}
          {step === "idle" && (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-12 transition-colors ${
                  isDragging ? "border-indigo-500 bg-indigo-500/10" : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/20">
                  <Upload className="h-6 w-6 text-indigo-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-white">Drop your file here or click to browse</p>
                  <p className="mt-1 text-xs text-zinc-500">Supports .csv and .xlsx — max 500 leads</p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={onFileChange}
                />
              </div>

              {/* Template hint */}
              <div className="rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3">
                <p className="mb-2 text-xs font-medium text-zinc-400">Required columns</p>
                <div className="flex flex-wrap gap-2">
                  {["name *", "phoneNumber *", "company", "industry"].map((col) => (
                    <span key={col} className="rounded-md bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-300">{col}</span>
                  ))}
                </div>
                <p className="mt-2 text-xs text-zinc-600">Include the country code — with or without the leading +. E.g. 919876543210 or +919876543210. Flexible headers accepted (e.g. &quot;Phone Number&quot;, &quot;phone&quot;, &quot;mobile&quot;).</p>
              </div>
            </>
          )}

          {/* Step: preview */}
          {step === "preview" && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-indigo-400" />
                  <span className="text-sm text-zinc-300">{fileName}</span>
                </div>
                <button onClick={reset} className="text-xs text-zinc-500 hover:text-white transition-colors">
                  Change file
                </button>
              </div>

              {/* Parse error summary */}
              {parseErrors.length > 0 && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 space-y-1.5">
                  <p className="text-xs font-medium text-red-400 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {parseErrors.length} row{parseErrors.length > 1 ? "s" : ""} will be skipped
                  </p>
                  <ul className="space-y-0.5 max-h-28 overflow-y-auto">
                    {parseErrors.map((e, i) => (
                      <li key={i} className="text-xs text-red-300">
                        Row {e.row}: <span className="font-mono">{e.phoneNumber || e.name}</span> — {e.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {uploadError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {uploadError}
                </div>
              )}

              {/* Valid rows preview */}
              {parsedRows.length > 0 ? (
                <div className="rounded-xl border border-white/10 overflow-hidden">
                  <div className="flex items-center justify-between border-b border-white/5 px-4 py-2">
                    <span className="text-xs text-zinc-400">{parsedRows.length} leads ready to import</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-zinc-950">
                        <tr className="border-b border-white/5">
                          <th className="px-4 py-2 text-left font-medium text-zinc-500">Name</th>
                          <th className="px-4 py-2 text-left font-medium text-zinc-500">Phone</th>
                          <th className="px-4 py-2 text-left font-medium text-zinc-500">Company</th>
                          <th className="px-4 py-2 text-left font-medium text-zinc-500">Industry</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {parsedRows.map((row, i) => (
                          <tr key={i}>
                            <td className="px-4 py-2 text-zinc-300">{row.name}</td>
                            <td className="px-4 py-2 font-mono text-indigo-300">{row.phoneNumber}</td>
                            <td className="px-4 py-2 text-zinc-400">{row.company ?? "—"}</td>
                            <td className="px-4 py-2 text-zinc-400">{row.industry ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 px-6 py-8 text-center text-sm text-zinc-500">
                  No valid leads found in this file.
                </div>
              )}
            </>
          )}

          {/* Step: uploading */}
          {step === "uploading" && (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
              <p className="text-sm text-zinc-400">Creating {parsedRows.length} leads and queueing calls…</p>
            </div>
          )}

          {/* Step: done */}
          {step === "done" && result && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 py-6">
                <CheckCircle2 className="h-10 w-10 text-green-400" />
                <p className="text-base font-semibold text-white">Import complete</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-green-400">{result.created}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">Created & Queued</p>
                </div>
                <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-yellow-400">{result.duplicates}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">Duplicates Skipped</p>
                </div>
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-red-400">{result.errors}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">Errors</p>
                </div>
              </div>
              {result.errors > 0 && (
                <ul className="max-h-28 overflow-y-auto rounded-lg border border-red-500/10 bg-red-500/5 p-3 space-y-1">
                  {result.results
                    .filter((r) => r.status === "error")
                    .map((r, i) => (
                      <li key={i} className="text-xs text-red-300">
                        <span className="font-mono">{r.phoneNumber}</span>
                        {r.status === "error" ? ` — ${r.reason}` : ""}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
          {step === "idle" && (
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          )}
          {step === "preview" && (
            <>
              <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
              <Button
                size="sm"
                disabled={parsedRows.length === 0}
                onClick={handleUpload}
              >
                <Copy className="h-4 w-4" />
                Upload {parsedRows.length > 0 ? `${parsedRows.length} Lead${parsedRows.length > 1 ? "s" : ""}` : ""}
              </Button>
            </>
          )}
          {step === "uploading" && (
            <Button size="sm" disabled>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading…
            </Button>
          )}
          {step === "done" && (
            <Button size="sm" onClick={onClose}>Close</Button>
          )}
        </div>
      </div>
    </div>
  );
}
