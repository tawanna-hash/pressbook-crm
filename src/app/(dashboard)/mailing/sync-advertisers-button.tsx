"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  syncActiveClientsToAdvertisers,
  type SyncAdvertisersResult,
} from "./actions";

export function SyncAdvertisersButton() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SyncAdvertisersResult | null>(null);

  function run() {
    startTransition(async () => {
      const res = await syncActiveClientsToAdvertisers();
      setResult(res);
      // Auto-clear the toast after a few seconds.
      setTimeout(() => setResult(null), 3500);
    });
  }

  return (
    <div className="relative inline-block">
      <Button
        type="button"
        variant="secondary"
        size="md"
        onClick={run}
        disabled={pending}
        leftIcon={
          pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )
        }
        title="Add any active client who isn't already on the Advertisers list"
      >
        {pending ? "Syncing…" : "Sync Active Clients"}
      </Button>
      {result && (
        <div
          className={`absolute right-0 top-full z-40 mt-1 flex items-center gap-1.5 whitespace-nowrap rounded-[var(--r)] px-2.5 py-1.5 text-[11px] font-medium shadow-lg ${
            result.ok
              ? "bg-[rgba(16,185,129,0.12)] text-pb-green"
              : "bg-[rgba(219,25,36,0.12)] text-pb-red"
          }`}
        >
          {result.ok ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <AlertCircle className="h-3 w-3" />
          )}
          {result.message}
        </div>
      )}
    </div>
  );
}
