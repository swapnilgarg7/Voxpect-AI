"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Phone, Loader2 } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface FieldErrors {
  name?: string[];
  phoneNumber?: string[];
  company?: string[];
  industry?: string[];
}

const INDUSTRIES = [
  "Technology",
  "SaaS",
  "Finance",
  "Healthcare",
  "Real Estate",
  "E-commerce",
  "Manufacturing",
  "Education",
  "Marketing",
  "Other",
];

export default function NewLeadPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setServerError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/dashboard/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phoneNumber: phoneNumber.trim(),
          company: company.trim() || undefined,
          industry: industry || undefined,
        }),
      });

      const data = (await res.json()) as {
        leadId?: string;
        error?: string;
        issues?: FieldErrors;
      };

      if (res.status === 422 && data.issues) {
        setFieldErrors(data.issues);
        return;
      }

      if (res.status === 409) {
        if (data.leadId) {
          router.push(`/dashboard/leads/${data.leadId}`);
        } else {
          setServerError(data.error ?? "Duplicate lead");
        }
        return;
      }

      if (!res.ok) {
        setServerError(data.error ?? "Something went wrong");
        return;
      }

      router.push(`/dashboard/leads/${data.leadId}`);
    } catch {
      setServerError("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/leads"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">New Lead</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Add a lead — an outbound call will be triggered automatically
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300" htmlFor="name">
                Name <span className="text-red-400">*</span>
              </label>
              <Input
                id="name"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
              />
              {fieldErrors.name && (
                <p className="text-xs text-red-400">{fieldErrors.name[0]}</p>
              )}
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300" htmlFor="phone">
                Phone Number <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                <Input
                  id="phone"
                  className="pl-8"
                  placeholder="+14155552671"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <p className="text-xs text-zinc-600">E.164 format required (e.g. +14155552671)</p>
              {fieldErrors.phoneNumber && (
                <p className="text-xs text-red-400">{fieldErrors.phoneNumber[0]}</p>
              )}
            </div>

            {/* Company */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300" htmlFor="company">
                Company
              </label>
              <Input
                id="company"
                placeholder="Acme Corp"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                disabled={submitting}
              />
            </div>

            {/* Industry */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300" htmlFor="industry">
                Industry
              </label>
              <select
                id="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                disabled={submitting}
                className="h-9 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              >
                <option value="" className="bg-zinc-900">Select industry…</option>
                {INDUSTRIES.map((ind) => (
                  <option key={ind} value={ind} className="bg-zinc-900">
                    {ind}
                  </option>
                ))}
              </select>
            </div>

            {serverError && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {serverError}
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating lead…
                </>
              ) : (
                "Create Lead & Start Call"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
