"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneCall, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RetryCallButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleRetry() {
    setState("loading");
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/dashboard/leads/${leadId}/retry`, {
        method: "POST",
      });

      const data = (await res.json()) as { queued?: boolean; error?: string };

      if (!res.ok) {
        setErrorMsg(data.error ?? "Failed to queue call");
        setState("error");
        return;
      }

      setState("success");
      // Refresh the page after a short delay so the status updates
      setTimeout(() => router.refresh(), 1500);
    } catch {
      setErrorMsg("Network error — please try again");
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-sm text-emerald-400">
        <CheckCircle2 className="h-4 w-4" />
        Call queued — dialling now
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        onClick={handleRetry}
        disabled={state === "loading"}
      >
        {state === "loading" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Queuing…
          </>
        ) : (
          <>
            <PhoneCall className="h-4 w-4" />
            Retry Call
          </>
        )}
      </Button>
      {state === "error" && errorMsg && (
        <p className="text-xs text-red-400">{errorMsg}</p>
      )}
    </div>
  );
}
