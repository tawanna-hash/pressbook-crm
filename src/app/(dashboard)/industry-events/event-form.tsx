"use client";

import { useActionState, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarPlus,
  CheckCircle2,
  X,
} from "lucide-react";
import {
  saveIndustryEvent,
  type EventFormState,
} from "./actions";
import { EVENT_COLORS, DEFAULT_EVENT_COLOR } from "./event-options";

const INITIAL: EventFormState = { ok: false, message: "" };

export type EventInitialValues = {
  id?: string;
  title?: string;
  description?: string | null;
  allDay?: boolean | null;
  startAt?: Date | string | null;
  endAt?: Date | string | null;
  venueName?: string | null;
  address?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  websiteUrl?: string | null;
  memberPriceCents?: number | null;
  nonMemberPriceCents?: number | null;
  courseNumber?: string | null;
  trecLicenseNumber?: string | null;
  category?: string | null;
  organizer?: string | null;
  tags?: string[] | null;
  pushToTeamCalendar?: boolean | null;
  eventColor?: string | null;
};

export type EventFormOptions = {
  categories: { id: string; name: string }[];
  organizers: { id: string; name: string }[];
};

function fieldClasses(hasError?: boolean) {
  const base =
    "w-full rounded-[var(--r)] border bg-card px-3.5 py-2 text-[13px] text-text focus:outline-none focus:ring-2";
  return hasError
    ? `${base} border-pb-red focus:border-pb-red focus:ring-[rgba(219,25,36,0.18)]`
    : `${base} border-border focus:border-pb-navy focus:ring-[rgba(2,29,64,0.15)]`;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b border-border pb-2 text-[10px] font-semibold uppercase tracking-wider text-text-2">
      {children}
    </div>
  );
}

function dateOnly(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  // YYYY-MM-DD in local time
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function timeOnly(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function centsToDollars(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

export function EventForm({
  initial = {},
  options,
  onClose,
  modeLabel = "New Event",
}: {
  initial?: EventInitialValues;
  options: EventFormOptions;
  onClose: () => void;
  modeLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(
    saveIndustryEvent,
    INITIAL,
  );
  const errors = state.fieldErrors ?? {};

  // Local state for fields that drive UI behavior.
  const [allDay, setAllDay] = useState<boolean>(Boolean(initial.allDay));
  const [color, setColor] = useState<string>(
    initial.eventColor ?? DEFAULT_EVENT_COLOR,
  );

  useEffect(() => {
    if (state.ok) {
      // Brief delay so the success message is visible.
      const t = setTimeout(() => onClose(), 800);
      return () => clearTimeout(t);
    }
  }, [state, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div className="w-full max-w-2xl rounded-[var(--rlg)] bg-card shadow-[var(--sh-lg)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2.5">
            <CalendarPlus className="h-4 w-4 text-pb-navy" />
            <h2 className="text-base font-semibold text-text">{modeLabel}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-text-2 hover:bg-muted-bg hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form action={formAction} className="space-y-6 px-6 py-5">
          {initial.id && <input type="hidden" name="id" value={initial.id} />}

          {/* Event Details */}
          <section className="space-y-4">
            <SectionHeader>Event Details</SectionHeader>
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
                placeholder="Event title"
                defaultValue={initial.title ?? ""}
                className={fieldClasses(Boolean(errors.title))}
              />
              {errors.title && (
                <p className="mt-1 text-[11px] text-pb-red">{errors.title}</p>
              )}
            </div>
            <div>
              <label
                htmlFor="description"
                className="mb-1.5 block text-[12px] font-semibold text-text-2"
              >
                Details / Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                placeholder="Full event description, agenda, notes…"
                defaultValue={initial.description ?? ""}
                className={fieldClasses(false)}
              />
            </div>
          </section>

          {/* Date & Time */}
          <section className="space-y-4">
            <SectionHeader>Date &amp; Time</SectionHeader>
            <label className="flex items-center justify-center gap-2 text-[12.5px] text-text">
              <input
                type="checkbox"
                name="allDay"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border accent-pb-navy"
              />
              All Day Event
            </label>
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
                  defaultValue={dateOnly(initial.startAt)}
                  className={fieldClasses(false)}
                />
              </div>
              {!allDay && (
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
                    defaultValue={timeOnly(initial.startAt)}
                    className={fieldClasses(false)}
                  />
                </div>
              )}
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
                  defaultValue={dateOnly(initial.endAt)}
                  className={fieldClasses(false)}
                />
              </div>
              {!allDay && (
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
                    defaultValue={timeOnly(initial.endAt)}
                    className={fieldClasses(false)}
                  />
                </div>
              )}
            </div>
          </section>

          {/* Location */}
          <section className="space-y-4">
            <SectionHeader>Location</SectionHeader>
            <div>
              <label
                htmlFor="venueName"
                className="mb-1.5 block text-[12px] font-semibold text-text-2"
              >
                Venue / Location Name
              </label>
              <input
                id="venueName"
                name="venueName"
                type="text"
                placeholder="Convention center, hotel, Zoom, etc."
                defaultValue={initial.venueName ?? ""}
                className={fieldClasses(false)}
              />
            </div>
            <div>
              <label
                htmlFor="address"
                className="mb-1.5 block text-[12px] font-semibold text-text-2"
              >
                Address
              </label>
              <input
                id="address"
                name="address"
                type="text"
                placeholder="Street address"
                defaultValue={initial.address ?? ""}
                className={fieldClasses(false)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <input
                name="city"
                type="text"
                placeholder="City"
                defaultValue={initial.city ?? ""}
                className={fieldClasses(false)}
              />
              <input
                name="state"
                type="text"
                placeholder="State"
                defaultValue={initial.state ?? ""}
                className={fieldClasses(false)}
              />
              <input
                name="zip"
                type="text"
                placeholder="ZIP"
                defaultValue={initial.zip ?? ""}
                className={fieldClasses(false)}
              />
            </div>
          </section>

          {/* Pricing & Licensing */}
          <section className="space-y-4">
            <SectionHeader>Pricing &amp; Licensing</SectionHeader>
            <div>
              <label
                htmlFor="websiteUrl"
                className="mb-1.5 block text-[12px] font-semibold text-text-2"
              >
                Website / Registration URL
              </label>
              <input
                id="websiteUrl"
                name="websiteUrl"
                type="url"
                placeholder="https://…"
                defaultValue={initial.websiteUrl ?? ""}
                className={fieldClasses(Boolean(errors.websiteUrl))}
              />
              {errors.websiteUrl && (
                <p className="mt-1 text-[11px] text-pb-red">{errors.websiteUrl}</p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="memberPrice"
                  className="mb-1.5 block text-[12px] font-semibold text-text-2"
                >
                  Member / Subscriber Price
                </label>
                <input
                  id="memberPrice"
                  name="memberPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  defaultValue={centsToDollars(initial.memberPriceCents)}
                  className={fieldClasses(Boolean(errors.memberPrice))}
                />
                {errors.memberPrice && (
                  <p className="mt-1 text-[11px] text-pb-red">{errors.memberPrice}</p>
                )}
              </div>
              <div>
                <label
                  htmlFor="nonMemberPrice"
                  className="mb-1.5 block text-[12px] font-semibold text-text-2"
                >
                  Non-Member Price
                </label>
                <input
                  id="nonMemberPrice"
                  name="nonMemberPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  defaultValue={centsToDollars(initial.nonMemberPriceCents)}
                  className={fieldClasses(Boolean(errors.nonMemberPrice))}
                />
                {errors.nonMemberPrice && (
                  <p className="mt-1 text-[11px] text-pb-red">{errors.nonMemberPrice}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="courseNumber"
                  className="mb-1.5 block text-[12px] font-semibold text-text-2"
                >
                  Course Number
                </label>
                <input
                  id="courseNumber"
                  name="courseNumber"
                  type="text"
                  placeholder="Course #"
                  defaultValue={initial.courseNumber ?? ""}
                  className={fieldClasses(false)}
                />
              </div>
              <div>
                <label
                  htmlFor="trecLicenseNumber"
                  className="mb-1.5 block text-[12px] font-semibold text-text-2"
                >
                  TREC License Number
                </label>
                <input
                  id="trecLicenseNumber"
                  name="trecLicenseNumber"
                  type="text"
                  placeholder="TREC #"
                  defaultValue={initial.trecLicenseNumber ?? ""}
                  className={fieldClasses(false)}
                />
              </div>
            </div>
          </section>

          {/* Classification */}
          <section className="space-y-4">
            <SectionHeader>Classification</SectionHeader>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="category"
                  className="mb-1.5 block text-[12px] font-semibold text-text-2"
                >
                  Category
                </label>
                {options.categories.length > 0 ? (
                  <select
                    id="category"
                    name="category"
                    defaultValue={initial.category ?? ""}
                    className={fieldClasses(false)}
                  >
                    <option value="">— None —</option>
                    {options.categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="category"
                    name="category"
                    type="text"
                    placeholder="Type a category…"
                    defaultValue={initial.category ?? ""}
                    className={fieldClasses(false)}
                  />
                )}
              </div>
              <div>
                <label
                  htmlFor="organizer"
                  className="mb-1.5 block text-[12px] font-semibold text-text-2"
                >
                  Organizer
                </label>
                {options.organizers.length > 0 ? (
                  <input
                    id="organizer"
                    name="organizer"
                    list="organizer-list"
                    type="text"
                    placeholder="Organizer name"
                    defaultValue={initial.organizer ?? ""}
                    className={fieldClasses(false)}
                  />
                ) : (
                  <input
                    id="organizer"
                    name="organizer"
                    type="text"
                    placeholder="Organizer name"
                    defaultValue={initial.organizer ?? ""}
                    className={fieldClasses(false)}
                  />
                )}
                {options.organizers.length > 0 && (
                  <datalist id="organizer-list">
                    {options.organizers.map((o) => (
                      <option key={o.id} value={o.name} />
                    ))}
                  </datalist>
                )}
              </div>
            </div>
            <div>
              <label
                htmlFor="tags"
                className="mb-1.5 block text-[12px] font-semibold text-text-2"
              >
                Tags <span className="text-text-3">(comma-separated)</span>
              </label>
              <input
                id="tags"
                name="tags"
                type="text"
                placeholder="e.g. CE Course, Networking, Open House"
                defaultValue={(initial.tags ?? []).join(", ")}
                className={fieldClasses(false)}
              />
            </div>
            <label className="flex items-start gap-2.5 rounded-[var(--r)] border border-border bg-muted-bg px-3 py-2.5 text-[12.5px] text-text">
              <input
                type="checkbox"
                name="pushToTeamCalendar"
                defaultChecked={Boolean(initial.pushToTeamCalendar)}
                className="mt-0.5 h-3.5 w-3.5 rounded border-border accent-pb-navy"
              />
              <span>
                <strong className="font-semibold">Push to Team Calendar</strong>
                <br />
                <span className="text-text-2">
                  Automatically add this event to the Team Calendar so it
                  appears in scheduling.
                </span>
              </span>
            </label>
          </section>

          {/* Appearance */}
          <section className="space-y-3">
            <SectionHeader>Appearance</SectionHeader>
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-text-2">
                Event Color
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {EVENT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={c}
                    className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${
                      color === c
                        ? "ring-2 ring-text ring-offset-2 ring-offset-card"
                        : ""
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="ml-2 w-24 rounded-[var(--r)] border border-border bg-card px-2 py-1 text-[12px] font-mono text-text"
                  maxLength={7}
                />
                <span
                  className="h-6 w-6 rounded-full border border-border"
                  style={{ backgroundColor: color }}
                />
              </div>
              <input type="hidden" name="eventColor" value={color} />
            </div>
          </section>

          {/* Footer */}
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
                onClick={onClose}
                className="rounded-[var(--r)] border border-border bg-card px-4 py-2 text-[13px] font-medium text-text transition-colors hover:bg-muted-bg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-[var(--r)] bg-pb-navy px-5 py-2 text-[13px] font-semibold text-white shadow-[var(--sh-xs)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? "Saving…" : initial.id ? "Save Changes" : "Create Event"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
