"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createMailingContact,
  type CreateMailingResult,
} from "./actions";
import { segmentLabel, type MailingSegment } from "./mailing-options";

export function NewContactButton({ segment }: { segment: MailingSegment }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CreateMailingResult | null>(null);

  function close() {
    setOpen(false);
    setResult(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("segment", segment);
    startTransition(async () => {
      const res = await createMailingContact(fd);
      setResult(res);
      if (res.ok) {
        setTimeout(close, 900);
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="primary"
        size="md"
        onClick={() => setOpen(true)}
        leftIcon={<Plus className="h-3.5 w-3.5" />}
      >
        New Contact
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-[var(--rlg)] border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-[15px] font-semibold text-text">New Contact</h2>
                <p className="text-[12px] text-text-2">
                  Adding to <span className="font-semibold text-text">{segmentLabel(segment)}</span>.
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

            <form onSubmit={handleSubmit} className="space-y-3 px-5 py-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="First Name"   name="firstName"     required />
                <Field label="Last Name"    name="lastName"      />
                <Field label="Email"        name="email"         type="email" />
                <Field label="Phone"        name="phone"         />
                <Field label="Company"      name="company"       />
                <Field label="Title"        name="title"         />
                <Field label="License #"    name="licenseNumber" />
              </div>

              <Field label="Address" name="address" />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="City"  name="city"  />
                <Field label="State" name="state" />
                <Field label="ZIP"   name="zip"   />
              </div>

              <Field label="Website" name="website" />

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-2">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  className="w-full rounded-[var(--r)] border border-border bg-surface-2 px-3 py-2 text-[13px] text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-pb-navy/20"
                />
              </div>

              <p className="text-[11px] text-text-2">
                Either First Name or Email is required.
              </p>

              {result && !result.ok && (
                <div className="flex items-center gap-2 rounded-[var(--r)] bg-[rgba(219,25,36,0.08)] px-3 py-2 text-[12.5px] text-pb-red">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {result.message}
                </div>
              )}
              {result && result.ok && (
                <div className="flex items-center gap-2 rounded-[var(--r)] bg-[rgba(16,185,129,0.08)] px-3 py-2 text-[12.5px] text-pb-green">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {result.message}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
                <Button type="button" variant="secondary" size="sm" onClick={close}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={pending}
                  leftIcon={
                    pending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )
                  }
                >
                  {pending ? "Adding…" : "Add Contact"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  name,
  required,
  type = "text",
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: "text" | "email";
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-text-2">
        {label}
        {required && <span className="ml-0.5 text-pb-red">*</span>}
      </label>
      <input
        type={type}
        name={name}
        required={required}
        className="w-full rounded-[var(--r)] border border-border bg-surface-2 px-3 py-2 text-[13px] text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-pb-navy/20"
      />
    </div>
  );
}
