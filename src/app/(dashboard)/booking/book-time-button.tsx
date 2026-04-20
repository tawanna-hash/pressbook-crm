"use client";

import { useMemo, useState, useTransition } from "react";
import { Calendar, Check, Clock, MapPin, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bookTime } from "./actions";

type AvailabilityRow = {
  dayOfWeek: number; // 0 = Sun, 6 = Sat
  startTime: string; // "HH:mm"
  endTime: string;
};

type Props = {
  memberId: string;
  memberName: string;
  memberEmail: string;
  durationMinutes: number;
  location: string;
  availability: AvailabilityRow[];
  /** ISO strings for already-booked start times on this member */
  bookedStartAtIsos: string[];
  /** Pre-fill for the signed-in user, if any */
  viewerName?: string | null;
  viewerEmail?: string | null;
};

// ─── Slot generation ──────────────────────────────────────────
function parseHm(hm: string): { h: number; m: number } {
  const [h, m] = hm.split(":").map(Number);
  return { h: h ?? 0, m: m ?? 0 };
}

function addMinutes(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 60_000);
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTimeLabel(d: Date): string {
  return d
    .toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(" ", "")
    .toLowerCase();
}

/**
 * Expand weekly availability rows into concrete start-time Date objects for
 * the next N days, at `durationMinutes` intervals. Skips slots in the past
 * and slots already booked.
 */
function buildSlots(
  availability: AvailabilityRow[],
  durationMinutes: number,
  bookedSet: Set<string>,
  daysAhead: number,
): Date[] {
  const slots: Date[] = [];
  const now = new Date();
  const base = startOfDay(now);

  for (let i = 0; i < daysAhead; i++) {
    const day = new Date(base);
    day.setDate(base.getDate() + i);
    const dow = day.getDay();

    const rows = availability.filter((a) => a.dayOfWeek === dow);
    for (const row of rows) {
      const s = parseHm(row.startTime);
      const e = parseHm(row.endTime);
      const dayStart = new Date(day);
      dayStart.setHours(s.h, s.m, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(e.h, e.m, 0, 0);

      for (
        let cursor = dayStart;
        addMinutes(cursor, durationMinutes).getTime() <= dayEnd.getTime();
        cursor = addMinutes(cursor, durationMinutes)
      ) {
        if (cursor.getTime() < now.getTime()) continue;
        if (bookedSet.has(cursor.toISOString())) continue;
        slots.push(new Date(cursor));
      }
    }
  }
  return slots.sort((a, b) => a.getTime() - b.getTime());
}

// ─── Component ────────────────────────────────────────────────
// Fallback: if a member has no availability rows set, offer Mon–Fri 9–5
// slots so the button is never dead. Staff can override later via the
// Availability & Links modal.
const DEFAULT_AVAILABILITY: AvailabilityRow[] = [1, 2, 3, 4, 5].map((dow) => ({
  dayOfWeek: dow,
  startTime: "09:00",
  endTime: "17:00",
}));

export function BookTimeButton({
  memberId,
  memberName,
  memberEmail,
  durationMinutes,
  location,
  availability,
  bookedStartAtIsos,
  viewerName,
  viewerEmail,
}: Props) {
  const [open, setOpen] = useState(false);
  const effectiveAvailability =
    availability.length > 0 ? availability : DEFAULT_AVAILABILITY;
  const usingDefault = availability.length === 0;

  return (
    <>
      <Button
        type="button"
        variant="primary"
        size="md"
        className="mt-auto"
        onClick={() => setOpen(true)}
        leftIcon={<Calendar className="h-3.5 w-3.5" />}
      >
        Book a Time
      </Button>
      {open && (
        <BookTimeModal
          memberId={memberId}
          memberName={memberName}
          memberEmail={memberEmail}
          durationMinutes={durationMinutes}
          location={location}
          availability={effectiveAvailability}
          bookedStartAtIsos={bookedStartAtIsos}
          viewerName={viewerName}
          viewerEmail={viewerEmail}
          usingDefault={usingDefault}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ─── Modal ────────────────────────────────────────────────────
function BookTimeModal({
  memberId,
  memberName,
  memberEmail,
  durationMinutes,
  location,
  availability,
  bookedStartAtIsos,
  viewerName,
  viewerEmail,
  usingDefault,
  onClose,
}: Props & { usingDefault?: boolean; onClose: () => void }) {
  const [selected, setSelected] = useState<Date | null>(null);
  const [name, setName] = useState(viewerName ?? "");
  const [email, setEmail] = useState(viewerEmail ?? "");
  const [error, setError] = useState<string | null>(null);
  const [confirmedAt, setConfirmedAt] = useState<Date | null>(null);
  const [isPending, startTransition] = useTransition();

  const slots = useMemo(() => {
    const set = new Set(bookedStartAtIsos);
    return buildSlots(availability, durationMinutes, set, 14);
  }, [availability, durationMinutes, bookedStartAtIsos]);

  const grouped = useMemo(() => {
    const byDay = new Map<string, Date[]>();
    for (const s of slots) {
      const k = `${s.getFullYear()}-${s.getMonth()}-${s.getDate()}`;
      const arr = byDay.get(k) ?? [];
      arr.push(s);
      byDay.set(k, arr);
    }
    return Array.from(byDay.values()).map((arr) => ({
      label: formatDayLabel(arr[0]),
      slots: arr,
    }));
  }, [slots]);

  function submit() {
    setError(null);
    if (!selected) return;
    const fd = new FormData();
    fd.set("memberId", memberId);
    fd.set("startAt", selected.toISOString());
    fd.set("clientName", name);
    fd.set("clientEmail", email);
    startTransition(async () => {
      const res = await bookTime(fd);
      if (res.ok) setConfirmedAt(selected);
      else setError(res.error);
    });
  }

  if (confirmedAt) {
    return (
      <ModalShell onClose={onClose} title="You're Booked" caption={memberName}>
        <div className="flex flex-col items-center px-6 py-8 text-center">
          <div className="relative mb-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(34,139,99,0.12)] text-[rgb(34,139,99)]">
              <Check className="h-6 w-6" />
            </div>
            <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-[rgb(34,139,99)]" />
          </div>
          <h3 className="mb-1 text-[15px] font-semibold text-text">
            Booked with {memberName}
          </h3>
          <p className="mb-0.5 text-[13px] text-text-2">
            {formatDayLabel(confirmedAt)} · {formatTimeLabel(confirmedAt)}
          </p>
          <p className="text-[12px] text-text-3">
            Confirmation sent to {email}.
          </p>
        </div>
        <div className="flex justify-end border-t border-border bg-muted-bg/30 px-6 py-3.5">
          <Button variant="primary" size="md" onClick={onClose}>
            Done
          </Button>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell
      onClose={onClose}
      title={`Book Time with ${memberName}`}
      caption={`${durationMinutes} min · ${location || memberEmail}`}
    >
      {slots.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <Calendar className="mb-3 h-6 w-6 text-text-3" />
          <p className="text-[13px] text-text-2">
            No open times in the next two weeks.
          </p>
        </div>
      ) : (
        <div className="max-h-[calc(100vh-260px)] overflow-y-auto px-5 py-5 sm:px-6">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-text-2">
            Pick a time
          </div>
          <div className="mb-5 flex items-center gap-3 text-[12px] text-text-2">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {durationMinutes} min
            </span>
            {location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {location}
              </span>
            )}
          </div>
          {usingDefault && (
            <div className="mb-4 rounded-[var(--r)] border border-dashed border-border bg-muted-bg/40 px-3 py-2 text-[11.5px] text-text-2">
              Showing default Mon–Fri 9 AM – 5 PM window.{" "}
              {memberName.split(" ")[0]} hasn&apos;t set custom availability
              yet.
            </div>
          )}
          <div className="space-y-4">
            {grouped.map((g) => (
              <div key={g.label}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-[12px] font-semibold text-text">
                    {g.label}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {g.slots.map((s) => {
                    const active =
                      selected != null && selected.getTime() === s.getTime();
                    return (
                      <button
                        key={s.toISOString()}
                        type="button"
                        onClick={() => setSelected(s)}
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[12px] font-medium tabular-nums transition-colors ${
                          active
                            ? "border-pb-navy bg-pb-navy text-white"
                            : "border-border bg-card text-text-2 hover:border-pb-navy/40 hover:bg-pb-navy/5 hover:text-pb-navy"
                        }`}
                      >
                        {formatTimeLabel(s)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Name + email */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-text-2">
                Your name <span className="text-pb-red">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-text-2">
                Email <span className="text-pb-red">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
              />
            </div>
          </div>

          {error && (
            <div className="mt-3 rounded-[var(--r)] border border-pb-red/30 bg-[rgba(219,25,36,0.06)] px-3 py-2 text-[12.5px] text-pb-red">
              {error}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-border bg-muted-bg/30 px-5 py-3.5 sm:px-6">
        <div className="text-[12.5px] text-text-2">
          {selected
            ? `${formatDayLabel(selected)} · ${formatTimeLabel(selected)}`
            : "No time selected"}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={submit}
            disabled={
              !selected || !name.trim() || !email.trim() || isPending
            }
          >
            {isPending ? "Booking…" : "Confirm Booking"}
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}

function ModalShell({
  title,
  caption,
  onClose,
  children,
}: {
  title: string;
  caption?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 backdrop-blur-sm sm:p-6">
      <div className="w-full max-w-xl overflow-hidden rounded-[var(--rlg)] bg-card shadow-[var(--sh-lg)] ring-1 ring-black/5">
        <div className="relative border-b border-border px-5 py-4 sm:px-6">
          <div className="flex flex-col items-center text-center">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-[var(--r)] bg-pb-navy/10 text-pb-navy">
              <Calendar className="h-[18px] w-[18px]" />
            </div>
            <div className="text-[15px] font-semibold text-text">{title}</div>
            {caption && (
              <div className="text-[12px] text-text-2">{caption}</div>
            )}
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
        {children}
      </div>
    </div>
  );
}
