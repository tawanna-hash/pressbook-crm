"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  FileText,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAgreement, updateAgreement } from "./actions";
import { AGREEMENT_TYPES, type AgreementStatus } from "./options";

const STATUS_OPTIONS: { value: AgreementStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

export type ClientOption = { id: string; name: string };

export type AgreementEditInitial = {
  id: string;
  contactId: string;
  type: string | null;
  status: AgreementStatus;
  startDate: string | null; // ISO or null
  endDate: string | null;
  amount: number | null; // cents
  notes: string | null;
};

type Mode = "create" | "edit";

function centsToDollarString(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

function isoToDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

/**
 * Trigger button + modal for creating OR editing an agreement. Pass
 * `mode="edit"` and `initial` to open as an editor; otherwise opens blank
 * for a new record.
 */
export function AgreementModalButton({
  mode,
  clients,
  initial,
  trigger,
}: {
  mode: Mode;
  clients: ClientOption[];
  initial?: AgreementEditInitial;
  /** Optional custom trigger — defaults to a primary "New Agreement" button. */
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)} className="contents">
          {trigger}
        </span>
      ) : mode === "edit" ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label="Edit agreement"
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <Button
          variant="primary"
          size="md"
          onClick={() => setOpen(true)}
          leftIcon={<Plus className="h-3.5 w-3.5" />}
        >
          New Agreement
        </Button>
      )}
      {open && (
        <AgreementModal
          mode={mode}
          clients={clients}
          initial={initial}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function AgreementModal({
  mode,
  clients,
  initial,
  onClose,
}: {
  mode: Mode;
  clients: ClientOption[];
  initial?: AgreementEditInitial;
  onClose: () => void;
}) {
  const [contactId, setContactId] = useState(initial?.contactId ?? "");
  const [type, setType] = useState(initial?.type ?? AGREEMENT_TYPES[0]);
  const [status, setStatus] = useState<AgreementStatus>(
    initial?.status ?? "draft",
  );
  const [startDate, setStartDate] = useState(isoToDateInput(initial?.startDate ?? null));
  const [endDate, setEndDate] = useState(isoToDateInput(initial?.endDate ?? null));
  const [amount, setAmount] = useState(centsToDollarString(initial?.amount));
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const fd = new FormData();
    if (mode === "edit" && initial) fd.set("id", initial.id);
    fd.set("contactId", contactId);
    fd.set("type", type);
    fd.set("status", status);
    fd.set("startDate", startDate);
    fd.set("endDate", endDate);
    fd.set("amount", amount);
    fd.set("notes", notes);

    start(async () => {
      const res =
        mode === "edit"
          ? await updateAgreement(fd)
          : await createAgreement(fd);
      if (res.ok) {
        setSuccess(mode === "edit" ? "Updated." : "Agreement created.");
        // Close after a short beat so the user sees the success line.
        setTimeout(() => onClose(), 600);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 backdrop-blur-sm sm:p-6">
      <div className="w-full max-w-xl overflow-hidden rounded-[var(--rlg)] bg-card shadow-[var(--sh-lg)] ring-1 ring-black/5">
        {/* Header */}
        <div className="relative border-b border-border px-5 py-4 sm:px-6">
          <div className="flex flex-col items-center text-center">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-[var(--r)] bg-pb-navy/10 text-pb-navy">
              <FileText className="h-[18px] w-[18px]" />
            </div>
            <div className="text-[15px] font-semibold text-text">
              {mode === "edit" ? "Edit Agreement" : "New Agreement"}
            </div>
            <div className="text-[12px] text-text-2">
              Track contract value, dates, and status.
            </div>
          </div>
          <div className="absolute right-4 top-4 sm:right-5">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="max-h-[calc(100vh-220px)] space-y-4 overflow-y-auto px-5 py-5 sm:px-6"
        >
          {/* Client */}
          <Field label="Client" required>
            <div className="relative">
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                required
                className="w-full appearance-none rounded-[var(--r)] border border-border bg-card px-3 py-2 pr-9 text-[13px] text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
              >
                <option value="" disabled>
                  {clients.length === 0
                    ? "No clients yet — add one first"
                    : "Pick a client"}
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-3" />
            </div>
          </Field>

          {/* Type + Status row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Type">
              <div className="relative">
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full appearance-none rounded-[var(--r)] border border-border bg-card px-3 py-2 pr-9 text-[13px] text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
                >
                  {AGREEMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-3" />
              </div>
            </Field>

            <Field label="Status">
              <div className="relative">
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as AgreementStatus)
                  }
                  className="w-full appearance-none rounded-[var(--r)] border border-border bg-card px-3 py-2 pr-9 text-[13px] text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-3" />
              </div>
            </Field>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Start date">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] tabular-nums text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
              />
            </Field>
            <Field label="End date">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] tabular-nums text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
              />
            </Field>
          </div>

          {/* Amount */}
          <Field label="Amount (USD)">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-text-3">
                $
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1500.00"
                className="w-full rounded-[var(--r)] border border-border bg-card py-2 pl-7 pr-3 text-[13px] tabular-nums text-text placeholder:text-text-3 focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
              />
            </div>
          </Field>

          {/* Notes */}
          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Anything worth capturing — scope, terms, contact points…"
              className="w-full rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] text-text placeholder:text-text-3 focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
            />
          </Field>

          {error && (
            <div className="flex items-start gap-2 rounded-[var(--r)] border border-pb-red/30 bg-[rgba(219,25,36,0.06)] px-3 py-2 text-[12.5px] text-pb-red">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2 rounded-[var(--r)] border border-[rgba(34,139,99,0.3)] bg-[rgba(34,139,99,0.06)] px-3 py-2 text-[12.5px] text-[rgb(22,101,72)]">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Footer */}
          <div className="-mx-5 flex items-center justify-end gap-2 border-t border-border bg-muted-bg/30 px-5 py-3.5 sm:-mx-6 sm:px-6">
            <Button variant="secondary" size="md" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={pending || !contactId}
            >
              {pending
                ? mode === "edit"
                  ? "Saving…"
                  : "Creating…"
                : mode === "edit"
                  ? "Save Changes"
                  : "Create Agreement"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-medium text-text-2">
        {label}
        {required && <span className="ml-0.5 text-pb-red">*</span>}
      </label>
      {children}
    </div>
  );
}
