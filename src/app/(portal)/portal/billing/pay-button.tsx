"use client";

import { useState, useTransition } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { startAgreementCheckout } from "./actions";

export function PayButton({ agreementId }: { agreementId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function pay() {
    setError(null);
    startTransition(async () => {
      const res = await startAgreementCheckout(agreementId);
      if (res.ok && res.url) {
        window.location.href = res.url;
      } else {
        setError(res.message ?? "Couldn't start checkout.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={pay}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg bg-pb-navy px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
        {pending ? "Opening…" : "Pay now"}
      </button>
      {error && <span className="text-[11px] text-pb-red">{error}</span>}
    </div>
  );
}
