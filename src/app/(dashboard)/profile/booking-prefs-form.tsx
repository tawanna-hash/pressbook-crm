"use client";

import { useActionState, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateBookingPrefs, type ProfileFormState } from "./actions";

const INITIAL: ProfileFormState = { ok: false, message: "" };

const DURATION_OPTIONS = [15, 30, 45, 60, 90];

type Initial = {
  publicBookingUrl: string;
  meetingDurationMinutes: number;
  meetingLocation: string;
  bookingBio: string;
};

export function BookingPrefsForm({ initial }: { initial: Initial }) {
  const [state, formAction, pending] = useActionState(
    updateBookingPrefs,
    INITIAL,
  );
  const [duration, setDuration] = useState(initial.meetingDurationMinutes);

  const errors = state.fieldErrors ?? {};

  return (
    <form
      action={formAction}
      className="rounded-[var(--rlg)] border border-border bg-card shadow-[var(--sh-xs)]"
    >
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-[var(--r)] bg-pb-navy/10 text-pb-navy">
          <CalendarClock className="h-[18px] w-[18px]" />
        </div>
        <div>
          <h2 className="text-[15px] font-semibold text-text">
            Booking Preferences
          </h2>
          <p className="mt-0.5 text-[12px] text-text-2">
            Controls how clients and teammates book time with you.
          </p>
        </div>
      </div>

      <div className="space-y-4 px-6 py-5">
        <div>
          <label className="mb-1 block text-[12px] font-medium text-text-2">
            Public Booking URL
          </label>
          <input
            type="url"
            name="publicBookingUrl"
            defaultValue={initial.publicBookingUrl}
            placeholder="https://calendly.com/yourname"
            className={`w-full rounded-[var(--r)] border bg-card px-3 py-2 text-[13px] text-text placeholder:text-text-3 focus:outline-none focus:ring-2 ${
              errors.publicBookingUrl
                ? "border-pb-red/50 focus:ring-pb-red/20"
                : "border-border focus:border-pb-navy focus:ring-[rgba(2,29,64,0.15)]"
            }`}
          />
          {errors.publicBookingUrl && (
            <p className="mt-1 text-[11.5px] text-pb-red">
              {errors.publicBookingUrl}
            </p>
          )}
          <p className="mt-1 text-[11.5px] text-text-3">
            Shown as your &ldquo;Book a Time&rdquo; link on the booking page.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[160px,1fr]">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-text-2">
              Default Duration
            </label>
            <div className="relative">
              <select
                name="meetingDurationMinutes"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full appearance-none rounded-[var(--r)] border border-border bg-card px-3 py-2 pr-9 text-[13px] text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
              >
                {DURATION_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} minutes
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-3" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-medium text-text-2">
              Meeting Location
            </label>
            <input
              type="text"
              name="meetingLocation"
              defaultValue={initial.meetingLocation}
              placeholder="Austin, TX — or a Zoom link, phone number, etc."
              className="w-full rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] text-text placeholder:text-text-3 focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[12px] font-medium text-text-2">
            Short Bio
          </label>
          <textarea
            name="bookingBio"
            defaultValue={initial.bookingBio}
            rows={3}
            placeholder="A line or two clients see on your booking card."
            className="w-full rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] text-text placeholder:text-text-3 focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
          />
        </div>

        {state.message && (
          <div
            className={`flex items-start gap-2 rounded-[var(--r)] border px-3 py-2 text-[12.5px] ${
              state.ok
                ? "border-[rgba(34,139,99,0.3)] bg-[rgba(34,139,99,0.06)] text-[rgb(22,101,72)]"
                : "border-pb-red/30 bg-[rgba(219,25,36,0.06)] text-pb-red"
            }`}
          >
            {state.ok ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            )}
            <span>{state.message}</span>
          </div>
        )}
      </div>

      <div className="flex justify-end border-t border-border bg-muted-bg/30 px-6 py-3.5">
        <Button type="submit" variant="primary" size="md" disabled={pending}>
          {pending ? "Saving…" : "Save Preferences"}
        </Button>
      </div>
    </form>
  );
}
