"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Calendar as CalIcon,
  Check,
  ChevronDown,
  Clock,
  Copy,
  ExternalLink,
  MapPin,
  Phone,
  Plus,
  Sparkles,
  Trash2,
  Users,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPoll } from "./actions";

// ─── Types ────────────────────────────────────────────────────
type LocationKey = "zoom" | "phone" | "in_person" | "all_options";

type ProposedTime = {
  /** ISO string — the start time only; end is derived from durationMinutes */
  startAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function todayDateInputValue(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function nextRoundTimeInputValue(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + (30 - (d.getMinutes() % 30)));
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function combineDateTime(dateStr: string, timeStr: string): Date {
  // YYYY-MM-DD + HH:mm → local Date
  const [y, m, d] = dateStr.split("-").map(Number);
  const [h, min] = timeStr.split(":").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, h ?? 0, min ?? 0, 0, 0);
}

function addMinutes(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 60_000);
}

function formatDateLabel(d: Date): string {
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

function groupByDay(times: ProposedTime[]): { label: string; rows: ProposedTime[] }[] {
  const map = new Map<string, { label: string; rows: ProposedTime[] }>();
  for (const t of times) {
    const d = new Date(t.startAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const existing = map.get(key);
    if (existing) {
      existing.rows.push(t);
    } else {
      map.set(key, { label: formatDateLabel(d), rows: [t] });
    }
  }
  // Sort groups chronologically
  return Array.from(map.values()).sort((a, b) => {
    const ta = new Date(a.rows[0].startAt).getTime();
    const tb = new Date(b.rows[0].startAt).getTime();
    return ta - tb;
  });
}

// Quick-add time chips — the most common meeting start times.
const QUICK_TIMES: { label: string; value: string }[] = [
  { label: "9 AM", value: "09:00" },
  { label: "10 AM", value: "10:00" },
  { label: "11 AM", value: "11:00" },
  { label: "1 PM", value: "13:00" },
  { label: "2 PM", value: "14:00" },
  { label: "3 PM", value: "15:00" },
  { label: "4 PM", value: "16:00" },
];

const DURATION_OPTIONS = [15, 30, 45, 60, 90];

// ─── Trigger button ───────────────────────────────────────────
export function CreatePollButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="primary"
        size="md"
        onClick={() => setOpen(true)}
        leftIcon={<Plus className="h-3.5 w-3.5" />}
      >
        Create Meeting Poll
      </Button>
      {open && <CreatePollModal onClose={() => setOpen(false)} />}
    </>
  );
}

// ─── Modal ────────────────────────────────────────────────────
function CreatePollModal({ onClose }: { onClose: () => void }) {
  // Event details
  const [name, setName] = useState("Meeting");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [location, setLocation] = useState<LocationKey>("zoom");
  const [description, setDescription] = useState("");
  const [showVotes, setShowVotes] = useState(true);

  // Proposed times (sorted chronologically whenever we update)
  const [times, setTimes] = useState<ProposedTime[]>([]);

  // Inline add-time form
  const [addDate, setAddDate] = useState(todayDateInputValue());
  const [addTime, setAddTime] = useState(nextRoundTimeInputValue());

  // Submit state
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, startSubmit] = useTransition();

  const grouped = useMemo(() => groupByDay(times), [times]);

  function addProposedTime(dateStr: string, timeStr: string) {
    if (!dateStr || !timeStr) return;
    const d = combineDateTime(dateStr, timeStr);
    if (Number.isNaN(d.getTime())) return;
    const iso = d.toISOString();
    setTimes((prev) => {
      if (prev.some((t) => t.startAt === iso)) return prev; // dedupe
      const next = [...prev, { startAt: iso }];
      next.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
      return next;
    });
  }

  function removeAt(iso: string) {
    setTimes((prev) => prev.filter((t) => t.startAt !== iso));
  }

  function handleSubmit() {
    setSubmitError(null);
    const payload = times.map((t) => {
      const start = new Date(t.startAt);
      const end = addMinutes(start, durationMinutes);
      return { startAt: start.toISOString(), endAt: end.toISOString() };
    });
    const fd = new FormData();
    fd.set("name", name.trim() || "Meeting");
    fd.set("durationMinutes", String(durationMinutes));
    fd.set("location", location);
    fd.set("description", description.trim());
    fd.set("showVotes", showVotes ? "on" : "off");
    fd.set("language", "en");
    fd.set("times", JSON.stringify(payload));

    startSubmit(async () => {
      const res = await createPoll(fd);
      if (res.ok) setShareToken(res.shareToken);
      else setSubmitError(res.error);
    });
  }

  if (shareToken) {
    return <ShareSuccess token={shareToken} onClose={onClose} />;
  }

  const canSubmit = name.trim().length > 0 && times.length > 0 && !isSubmitting;
  const dayCount = grouped.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 backdrop-blur-sm sm:p-6">
      <div className="w-full max-w-2xl overflow-hidden rounded-[var(--rlg)] bg-card shadow-[var(--sh-lg)] ring-1 ring-black/5">
        {/* Header */}
        <div className="relative border-b border-border px-5 py-4 sm:px-6">
          <div className="flex flex-col items-center text-center">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-[var(--r)] bg-pb-navy/10 text-pb-navy">
              <CalIcon className="h-[18px] w-[18px]" />
            </div>
            <div className="text-[15px] font-semibold text-text">
              New Meeting Poll
            </div>
            <div className="text-[12px] text-text-2">
              Propose times and let your team vote.
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

        {/* Body */}
        <div className="max-h-[calc(100vh-200px)] space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
          {/* Meeting name */}
          <Field label="Meeting name" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
              placeholder="Meeting"
            />
          </Field>

          {/* Duration + Location */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[160px,1fr]">
            <Field label="Duration">
              <div className="relative">
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
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
            </Field>

            <Field label="Location">
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                <LocationPill
                  value="zoom"
                  current={location}
                  onChange={setLocation}
                  icon={<Video className="h-3.5 w-3.5" />}
                  label="Zoom"
                />
                <LocationPill
                  value="phone"
                  current={location}
                  onChange={setLocation}
                  icon={<Phone className="h-3.5 w-3.5" />}
                  label="Phone"
                />
                <LocationPill
                  value="in_person"
                  current={location}
                  onChange={setLocation}
                  icon={<MapPin className="h-3.5 w-3.5" />}
                  label="In-person"
                />
                <LocationPill
                  value="all_options"
                  current={location}
                  onChange={setLocation}
                  icon={<Users className="h-3.5 w-3.5" />}
                  label="Any"
                />
              </div>
            </Field>
          </div>

          {/* Description */}
          <Field label="Description (optional)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What should voters know before the meeting?"
              className="w-full rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] text-text placeholder:text-text-3 focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
            />
          </Field>

          {/* Proposed times */}
          <section className="rounded-[var(--rlg)] border border-border bg-muted-bg/30 p-4 text-left">
            <div className="mb-3">
              <div className="text-[13px] font-semibold text-text">
                Proposed Times
              </div>
              <div className="text-[11.5px] text-text-2">
                {times.length === 0
                  ? "Add at least one time. Voters will pick which work."
                  : `${times.length} ${times.length === 1 ? "time" : "times"}${
                      dayCount > 0
                        ? ` on ${dayCount} ${dayCount === 1 ? "day" : "days"}`
                        : ""
                    }`}
              </div>
            </div>

            {/* Time list */}
            {grouped.length > 0 && (
              <div className="mb-3 space-y-3">
                {grouped.map((g) => (
                  <div key={g.label}>
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="text-[11.5px] font-semibold text-text">
                        {g.label}
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {g.rows.map((t) => {
                        const d = new Date(t.startAt);
                        const end = addMinutes(d, durationMinutes);
                        return (
                          <button
                            key={t.startAt}
                            type="button"
                            onClick={() => removeAt(t.startAt)}
                            title="Remove this time"
                            className="group/pill inline-flex items-center gap-1.5 rounded-full border border-pb-navy/20 bg-pb-navy/5 px-2.5 py-1 text-[12px] font-medium text-pb-navy transition-colors hover:border-pb-red/30 hover:bg-pb-red/10 hover:text-pb-red"
                          >
                            <Clock className="h-3 w-3 opacity-70" />
                            <span className="tabular-nums">
                              {formatTimeLabel(d)} – {formatTimeLabel(end)}
                            </span>
                            <Trash2 className="h-3 w-3 opacity-0 transition-opacity group-hover/pill:opacity-100" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Inline add-time row */}
            <div className="rounded-[var(--r)] border border-dashed border-border bg-card px-3 py-3">
              <div className="mb-2 flex items-center gap-2 text-[11.5px] font-semibold text-text-2">
                <Plus className="h-3.5 w-3.5" />
                Add a time
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="date"
                  value={addDate}
                  onChange={(e) => setAddDate(e.target.value)}
                  className="flex-1 rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] tabular-nums text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
                />
                <input
                  type="time"
                  value={addTime}
                  onChange={(e) => setAddTime(e.target.value)}
                  className="flex-1 rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] tabular-nums text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
                />
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => addProposedTime(addDate, addTime)}
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                >
                  Add
                </Button>
              </div>

              {/* Quick-pick times */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-[10.5px] font-semibold uppercase tracking-wider text-text-3">
                  Quick add
                </span>
                {QUICK_TIMES.map((q) => (
                  <button
                    key={q.value}
                    type="button"
                    onClick={() => addProposedTime(addDate, q.value)}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11.5px] font-medium text-text-2 transition-colors hover:border-pb-navy/40 hover:bg-pb-navy/5 hover:text-pb-navy"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Show votes toggle */}
          <ToggleRow
            checked={showVotes}
            onChange={setShowVotes}
            title="Show Voter Names"
            caption="Poll voters see each other's names and picks."
          />

          {submitError && (
            <div className="rounded-[var(--r)] border border-pb-red/30 bg-[rgba(219,25,36,0.06)] px-3.5 py-2.5 text-[12.5px] text-pb-red">
              {submitError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-border bg-muted-bg/30 px-5 py-3.5 sm:px-6">
          <div className="text-[12.5px] text-text-2">
            {times.length === 0 ? (
              <span className="text-text-3">No times yet</span>
            ) : (
              <>
                <span className="font-semibold text-text tabular-nums">
                  {times.length}
                </span>{" "}
                {times.length === 1 ? "time" : "times"} proposed
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {isSubmitting ? "Sharing…" : "Share Meeting Poll"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-pieces ───────────────────────────────────────────────
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

function LocationPill({
  value,
  current,
  onChange,
  icon,
  label,
}: {
  value: LocationKey;
  current: LocationKey;
  onChange: (v: LocationKey) => void;
  icon: React.ReactNode;
  label: string;
}) {
  const active = value === current;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`inline-flex items-center justify-center gap-1.5 rounded-[var(--r)] border px-2.5 py-2 text-[12px] font-medium transition-colors ${
        active
          ? "border-pb-navy bg-pb-navy/5 text-pb-navy ring-2 ring-[rgba(2,29,64,0.15)]"
          : "border-border bg-card text-text-2 hover:bg-muted-bg"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ToggleRow({
  checked,
  onChange,
  title,
  caption,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  caption: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[var(--r)] border border-border bg-card px-4 py-3 text-left">
      <div>
        <div className="text-[13px] font-semibold text-text">{title}</div>
        <div className="text-[12px] text-text-2">{caption}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-pb-navy" : "bg-muted-bg-2"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

// ─── Share success ────────────────────────────────────────────
function ShareSuccess({
  token,
  onClose,
}: {
  token: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const pollUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/p/${token}`
      : `/p/${token}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(pollUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard denied */
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 backdrop-blur-sm sm:p-6">
      <div className="w-full max-w-xl overflow-hidden rounded-[var(--rlg)] bg-card shadow-[var(--sh-lg)] ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(34,139,99,0.12)] text-[rgb(34,139,99)]">
              <Check className="h-4 w-4" />
              <Sparkles className="absolute -right-1 -top-1 h-3 w-3 text-[rgb(34,139,99)]" />
            </div>
            <div className="text-[14px] font-semibold text-text">
              Your Poll Is Ready to Share
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <div className="rounded-[var(--rlg)] bg-pb-navy px-4 py-4 text-white">
            <div className="mb-2 text-[12px] text-white/80">
              Anyone on your team with this link can vote:
            </div>
            <div className="flex gap-2">
              <input
                readOnly
                value={pollUrl}
                className="flex-1 rounded-[var(--r)] border border-white/10 bg-white/10 px-3 py-2 text-[13px] text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-[var(--r)] bg-white px-3 py-2 text-[12.5px] font-semibold text-pb-navy transition-opacity hover:opacity-90"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <a
              href={pollUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-white/90 hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Open the poll page
            </a>
          </div>

          <ol className="space-y-2.5 text-[12.5px] text-text-2">
            <StepLi n={1} title="Share the link" body="Send it to everyone who should vote." />
            <StepLi n={2} title="Track the votes" body="Check the scheduling page to see who's picked what." />
            <StepLi n={3} title="Book the winner" body="Pick the most popular time and send calendar invites." />
          </ol>
        </div>

        <div className="flex justify-end border-t border-border bg-muted-bg/30 px-5 py-3.5 sm:px-6">
          <Button variant="primary" size="md" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

function StepLi({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pb-navy/10 text-[10px] font-bold text-pb-navy">
        {n}
      </span>
      <div>
        <span className="font-semibold text-text">{title}</span>
        <span className="text-text-3"> · </span>
        {body}
      </div>
    </li>
  );
}
