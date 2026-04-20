"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CalendarPlus,
  CheckCircle2,
  X,
} from "lucide-react";
import { createAppointment, type AppointmentFormState } from "./actions";
import { APPOINTMENT_TYPES } from "./options";
import { Button } from "@/components/ui/button";

const INITIAL: AppointmentFormState = { ok: false, message: "" };

type ClientOption = {
  id: string;
  name: string;
};

function fieldClasses(hasError?: boolean) {
  const base =
    "w-full rounded-lg border bg-white px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2";
  return hasError
    ? `${base} border-red-400 focus:border-red-500 focus:ring-red-200`
    : `${base} border-gray-300 focus:border-pb-navy focus:ring-pb-navy/20`;
}

function defaultStartIso(): string {
  // Default to "now rounded up to next half hour", formatted for <input type=datetime-local>
  const d = new Date();
  d.setMinutes(d.getMinutes() + (30 - (d.getMinutes() % 30)));
  d.setSeconds(0, 0);
  // datetime-local expects YYYY-MM-DDTHH:mm in local time
  const tzOffset = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

export function AddAppointmentForm({ clients }: { clients: ClientOption[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    createAppointment,
    INITIAL,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Open the form when the URL hash is #add-appointment — lets a header-level
  // "+ New Appointment" link trigger it without prop-drilling state.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncFromHash = () => {
      if (window.location.hash === "#add-appointment") setOpen(true);
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      const t = setTimeout(() => {
        setOpen(false);
        // clear the hash so clicking the link again re-opens the form
        if (typeof window !== "undefined" && window.location.hash === "#add-appointment") {
          history.replaceState(null, "", window.location.pathname + window.location.search);
        }
      }, 1000);
      return () => clearTimeout(t);
    }
  }, [state]);

  const errors = state.fieldErrors ?? {};

  // Collapsed state now renders nothing — the trigger lives in the page header.
  if (!open) return null;

  const handleClose = () => {
    setOpen(false);
    if (typeof window !== "undefined" && window.location.hash === "#add-appointment") {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: "rgba(2, 29, 64, 0.08)" }}
          >
            <CalendarPlus className="h-4 w-4 text-pb-navy" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              New Appointment
            </h2>
            <p className="text-xs text-muted">
              Schedule a meeting, call, or signing with a client.
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form ref={formRef} action={formAction} className="space-y-4 px-6 py-5">
        <div>
          <label
            htmlFor="clientId"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Client <span className="text-pb-red">*</span>
          </label>
          {clients.length === 0 ? (
            <p className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm text-muted">
              No clients yet. Add a client first to schedule with them.
            </p>
          ) : (
            <select
              id="clientId"
              name="clientId"
              required
              defaultValue=""
              className={fieldClasses(Boolean(errors.clientId))}
            >
              <option value="" disabled>
                Pick a client…
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
          {errors.clientId && (
            <p className="mt-1 text-xs text-pb-red">{errors.clientId}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="title"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Title <span className="text-pb-red">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="Quarterly review, Listing signing…"
            className={fieldClasses(Boolean(errors.title))}
          />
          {errors.title && (
            <p className="mt-1 text-xs text-pb-red">{errors.title}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label
              htmlFor="date"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              When <span className="text-pb-red">*</span>
            </label>
            <input
              id="date"
              name="date"
              type="datetime-local"
              required
              defaultValue={defaultStartIso()}
              className={fieldClasses(Boolean(errors.date))}
            />
            {errors.date && (
              <p className="mt-1 text-xs text-pb-red">{errors.date}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="durationMinutes"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Duration
            </label>
            <select
              id="durationMinutes"
              name="durationMinutes"
              defaultValue="30"
              className={fieldClasses(false)}
            >
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">1 hour</option>
              <option value="90">1.5 hours</option>
              <option value="120">2 hours</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="type"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Type
            </label>
            <select
              id="type"
              name="type"
              defaultValue="Meeting"
              className={fieldClasses(false)}
            >
              {APPOINTMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="location"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Location
            </label>
            <input
              id="location"
              name="location"
              type="text"
              placeholder="Office, Zoom link, address…"
              className={fieldClasses(false)}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="notes"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Agenda, prep notes, anything to remember…"
            className={fieldClasses(false)}
          />
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
          {state.message ? (
            <div
              className={`flex items-center gap-2 text-sm ${
                state.ok ? "text-pb-green" : "text-pb-red"
              }`}
            >
              {state.ok ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span>{state.message}</span>
            </div>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || clients.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-pb-navy px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Saving…" : "Schedule"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
