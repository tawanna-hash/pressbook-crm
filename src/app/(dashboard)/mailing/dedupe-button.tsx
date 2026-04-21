"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  dedupeMailingContacts,
  type DedupeResult,
  type DedupeStrategy,
} from "./actions";
import type { MailingSegment } from "./mailing-options";

export function DedupeButton({ segment }: { segment: MailingSegment }) {
  const [open, setOpen] = useState(false);
  const [strategy, setStrategy] = useState<DedupeStrategy>("email");
  const [result, setResult] = useState<DedupeResult | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setResult(null);
    setStrategy("email");
  }

  function run() {
    startTransition(async () => {
      const res = await dedupeMailingContacts(segment, strategy);
      setResult(res);
      if (res.ok && res.removed === 0) {
        setTimeout(close, 1400);
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="md"
        onClick={() => setOpen(true)}
        leftIcon={<Copy className="h-3.5 w-3.5" />}
      >
        Dedupe
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[var(--rlg)] border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-[15px] font-semibold text-text">Duplicate Cleanup</h2>
                <p className="text-[12px] text-text-2">
                  Keeps the oldest row in each duplicate group.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="text-text-2 hover:text-text"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 px-5 py-4">
              <p className="text-[12.5px] text-text-2">Match duplicates by:</p>
              <div className="space-y-1.5">
                <RadioRow
                  checked={strategy === "email"}
                  onChange={() => setStrategy("email")}
                  title="Email address"
                  hint="Same email (case-insensitive). Rows with no email are skipped."
                />
                <RadioRow
                  checked={strategy === "name_phone"}
                  onChange={() => setStrategy("name_phone")}
                  title="Name + Phone"
                  hint="Same first name, last name, and phone (digits only)."
                />
              </div>

              {result && (
                <div
                  className={`flex items-center gap-2 rounded-[var(--r)] px-3 py-2 text-[12.5px] ${
                    result.ok && result.removed > 0
                      ? "bg-[rgba(16,185,129,0.08)] text-pb-green"
                      : result.ok
                        ? "bg-[rgba(50,58,70,0.08)] text-text-2"
                        : "bg-[rgba(219,25,36,0.08)] text-pb-red"
                  }`}
                >
                  {result.ok ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5" />
                  )}
                  {result.message}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
              <Button type="button" variant="secondary" size="sm" onClick={close}>
                Close
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={run}
                disabled={pending}
                leftIcon={
                  pending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )
                }
              >
                {pending ? "Cleaning…" : "Find & Remove"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function RadioRow({
  checked,
  onChange,
  title,
  hint,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  hint: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-2.5 rounded-[var(--r)] border px-3 py-2.5 transition-colors ${
        checked
          ? "border-pb-navy bg-pb-navy/5"
          : "border-border bg-surface-2 hover:bg-muted-bg"
      }`}
    >
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-3.5 w-3.5"
      />
      <div className="flex-1">
        <div className="text-[13px] font-semibold text-text">{title}</div>
        <div className="text-[11.5px] text-text-2">{hint}</div>
      </div>
    </label>
  );
}
