"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CalendarPlus,
  CheckCircle2,
  Plus,
  X,
} from "lucide-react";
import { createTeamEvent, type TeamEventFormState } from "./actions";

const INITIAL: TeamEventFormState = { ok: false, message: "" };

type OrgOption = { slug: string; name: string; brandColor: string };

function fieldClasses(hasError?: boolean) {
  const base =
    "w-full rounded-[var(--r)] border bg-card px-3.5 py-2 text-[13px] text-text focus:outline-none focus:ring-2";
  return hasError
    ? `${base} border-pb-red focus:border-pb-red focus:ring-[rgba(219,25,36,0.18)]`
    : `${base} border-border focus:border-pb-navy focus:ring-[rgba(2,29,64,0.15)]`;
}

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function nextHourIso(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function plusHourIso(hourStart: string): string {
  const [h, m] = hourStart.split(":").map(Number);
  const d = new Date();
  d.setHours(h + 1, m, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NewTeamEventButton({
  orgs,
  defaultOrgSlug,
}: {
  orgs: OrgOption[];
  defaultOrgSlug: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createTeamEvent, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      const t = setTimeout(() => setOpen(false), 800);
      return () => clearTimeout(t);
    }
  }, [state]);

  const errors = state.fieldErrors ?? {};
  const start = nextHourIso();
  const end = plusHourIso(start);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-[var(--r)] bg-pb-navy px-3.5 py-2 text-[13px] font-semibold text-white shadow-[var(--sh-xs)] transition-opacity hover:opacity-90"
      >
        <Plus className="h-3.5 w-3.5" />
        New
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
          <div className="w-full max-w-lg rounded-[var(--rlg)] bg-card shadow-[var(--sh-lg)]">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-2.5">
                <CalendarPlus className="h-4 w-4 text-pb-navy" />
                <h2 className="text-base font-semibold text-text">New Event</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-full p-1.5 text-text-2 hover:bg-muted-bg hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              ref={formRef}
              action={formAction}
              className="space-y-4 px-6 py-5"
            >
              <div>
                <label
                  htmlFor="title"
                  className="mb-1.5 block text-[12px] font-semibold text-text-2"
                >
                  Title <span className="text-pb-red">*</span>
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  required
                  placeholder="e.g. Initial Consultation — Johnson Family"
                  className={fieldClasses(Boolean(errors.title))}
                />
                {errors.title && (
                  <p className="mt-1 text-[11px] text-pb-red">{errors.title}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="clientName"
                    className="mb-1.5 block text-[12px] font-semibold text-text-2"
                  >
                    Client
                  </label>
                  <input
                    id="clientName"
                    name="clientName"
                    type="text"
                    placeholder="Client name"
                    className={fieldClasses(false)}
                  />
                </div>
                <div>
                  <label
                    htmlFor="agentEmail"
                    className="mb-1.5 block text-[12px] font-semibold text-text-2"
                  >
                    Agent Email
                  </label>
                  <input
                    id="agentEmail"
                    name="agentEmail"
                    type="email"
                    placeholder="agent@realtyline.com"
                    className={fieldClasses(Boolean(errors.agentEmail))}
                  />
                  {errors.agentEmail && (
                    <p className="mt-1 text-[11px] text-pb-red">{errors.agentEmail}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="startDate"
                    className="mb-1.5 block text-[12px] font-semibold text-text-2"
                  >
                    Start Date
                  </label>
                  <input
                    id="startDate"
                    name="startDate"
                    type="date"
                    defaultValue={todayIso()}
                    className={fieldClasses(Boolean(errors.startDate))}
                  />
                </div>
                <div>
                  <label
                    htmlFor="startTime"
                    className="mb-1.5 block text-[12px] font-semibold text-text-2"
                  >
                    Start Time
                  </label>
                  <input
                    id="startTime"
                    name="startTime"
                    type="time"
                    defaultValue={start}
                    className={fieldClasses(Boolean(errors.startTime))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="endDate"
                    className="mb-1.5 block text-[12px] font-semibold text-text-2"
                  >
                    End Date
                  </label>
                  <input
                    id="endDate"
                    name="endDate"
                    type="date"
                    defaultValue={todayIso()}
                    className={fieldClasses(false)}
                  />
                </div>
                <div>
                  <label
                    htmlFor="endTime"
                    className="mb-1.5 block text-[12px] font-semibold text-text-2"
                  >
                    End Time
                  </label>
                  <input
                    id="endTime"
                    name="endTime"
                    type="time"
                    defaultValue={end}
                    className={fieldClasses(false)}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="location"
                  className="mb-1.5 block text-[12px] font-semibold text-text-2"
                >
                  Address / Location
                </label>
                <input
                  id="location"
                  name="location"
                  type="text"
                  placeholder="Office, Zoom link, street address…"
                  className={fieldClasses(false)}
                />
              </div>

              <div>
                <label
                  htmlFor="notes"
                  className="mb-1.5 block text-[12px] font-semibold text-text-2"
                >
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  placeholder="Add any notes about this appointment…"
                  className={fieldClasses(false)}
                />
              </div>

              {orgs.length > 1 && (
                <div>
                  <label
                    htmlFor="orgSlug"
                    className="mb-1.5 block text-[12px] font-semibold text-text-2"
                  >
                    Company
                  </label>
                  <select
                    id="orgSlug"
                    name="orgSlug"
                    defaultValue={defaultOrgSlug}
                    className={fieldClasses(false)}
                  >
                    {orgs.map((o) => (
                      <option key={o.slug} value={o.slug}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-between gap-4 border-t border-border pt-4">
                {state.message ? (
                  <div
                    className={`flex items-center gap-2 text-[12.5px] ${
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
                    className="rounded-[var(--r)] border border-border bg-card px-4 py-2 text-[13px] font-medium text-text transition-colors hover:bg-muted-bg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-[var(--r)] bg-pb-navy px-5 py-2 text-[13px] font-semibold text-white shadow-[var(--sh-xs)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pending ? "Saving…" : "Schedule"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
