"use client";

import { useRef, useState, useTransition } from "react";
import {
  CalendarDays,
  CalendarRange,
  Check,
  ChevronDown,
  Clock,
  Info,
  Link as LinkIcon,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  addAvailabilitySlot,
  clearAvailabilityForUser,
  deleteAvailabilitySlot,
  saveOrgBookingUrl,
} from "./actions";
import { Button } from "@/components/ui/button";

const WEEKDAYS = [
  { value: 1, label: "Mon", short: "M" },
  { value: 2, label: "Tue", short: "T" },
  { value: 3, label: "Wed", short: "W" },
  { value: 4, label: "Thu", short: "T" },
  { value: 5, label: "Fri", short: "F" },
  { value: 6, label: "Sat", short: "S" },
  { value: 0, label: "Sun", short: "S" },
];

export type Slot = {
  id: string;
  userId: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type Member = { id: string; name: string };

export function AvailabilityModalButton({
  orgName,
  publicBookingUrl,
  slots,
  members,
}: {
  orgName: string;
  publicBookingUrl: string | null;
  slots: Slot[];
  members: Member[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="secondary"
        size="md"
        onClick={() => setOpen(true)}
        leftIcon={<Clock className="h-3.5 w-3.5" />}
      >
        Availability &amp; Links
      </Button>
      {open && (
        <AvailabilityModal
          orgName={orgName}
          publicBookingUrl={publicBookingUrl}
          slots={slots}
          members={members}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function AvailabilityModal({
  orgName,
  publicBookingUrl,
  slots,
  members,
  onClose,
}: {
  orgName: string;
  publicBookingUrl: string | null;
  slots: Slot[];
  members: Member[];
  onClose: () => void;
}) {
  const byMember = new Map<string | null, Slot[]>();
  for (const s of slots) {
    const key = s.userId ?? null;
    const arr = byMember.get(key) ?? [];
    arr.push(s);
    byMember.set(key, arr);
  }
  byMember.forEach((arr) =>
    arr.sort((a, b) =>
      a.dayOfWeek === b.dayOfWeek
        ? a.startTime.localeCompare(b.startTime)
        : a.dayOfWeek - b.dayOfWeek,
    ),
  );

  // ── Explicit save feedback for both forms ──
  const [urlPending, startUrl] = useTransition();
  const [urlSavedAt, setUrlSavedAt] = useState(0);
  const [urlError, setUrlError] = useState<string | null>(null);

  const [slotPending, startSlot] = useTransition();
  const [slotSavedAt, setSlotSavedAt] = useState(0);
  const [slotError, setSlotError] = useState<string | null>(null);

  const addSlotFormRef = useRef<HTMLFormElement>(null);

  function handleSaveUrl(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUrlError(null);
    const fd = new FormData(e.currentTarget);
    startUrl(async () => {
      const res = await saveOrgBookingUrl(fd);
      if (res.ok) {
        setUrlSavedAt(Date.now());
      } else {
        setUrlError(res.error);
      }
    });
  }

  function handleAddSlot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSlotError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    startSlot(async () => {
      const res = await addAvailabilitySlot(fd);
      if (res.ok) {
        setSlotSavedAt(Date.now());
        // Reset only the times — keep member + day for fast repeated adds.
        const s = form.elements.namedItem("startTime") as HTMLInputElement | null;
        const en = form.elements.namedItem("endTime") as HTMLInputElement | null;
        if (s) s.value = "09:00";
        if (en) en.value = "17:00";
      } else {
        setSlotError(res.error);
      }
    });
  }

  function handleDeleteSlot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSlotError(null);
    const fd = new FormData(e.currentTarget);
    void (async () => {
      const res = await deleteAvailabilitySlot(fd);
      if (!res.ok) setSlotError(res.error);
    })();
  }

  function handleClearForUser(userId: string | null, displayName: string) {
    const ok = window.confirm(
      `Clear all availability for ${displayName}? This can't be undone.`,
    );
    if (!ok) return;
    setSlotError(null);
    const fd = new FormData();
    fd.set("userId", userId ?? "");
    void (async () => {
      const res = await clearAvailabilityForUser(fd);
      if (!res.ok) setSlotError(res.error);
    })();
  }

  const urlJustSaved = urlSavedAt > 0 && Date.now() - urlSavedAt < 2500;
  const slotJustSaved = slotSavedAt > 0 && Date.now() - slotSavedAt < 2500;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm sm:p-8">
      <div className="w-full max-w-2xl overflow-hidden rounded-[var(--rlg)] bg-card shadow-[var(--sh-lg)] ring-1 ring-black/5">
        {/* ─── Header ─── */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r)] bg-pb-navy/10 text-pb-navy">
              <CalendarRange className="h-[18px] w-[18px]" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-text">
                Availability & Booking Links
              </h2>
              <p className="mt-0.5 text-[12.5px] text-text-2">
                Set hours and share a link for {orgName}.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-6 border-t border-border px-6 py-5">
          {/* ─── Public URL ─── */}
          <section>
            <SectionHeading
              title="Public Booking Link"
              caption="Clients land here when they tap any Book A Time button."
            />
            <form
              onSubmit={handleSaveUrl}
              className="mt-3 flex flex-col gap-2 sm:flex-row"
            >
              <div className="relative flex-1">
                <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-3" />
                <input
                  // Key ensures the default value refreshes after a successful
                  // save — without this, React keeps the controlled-ish input
                  // stale even after new props arrive.
                  key={publicBookingUrl ?? "empty"}
                  type="url"
                  name="publicBookingUrl"
                  defaultValue={publicBookingUrl ?? ""}
                  placeholder="https://calendly.com/yourname"
                  className="w-full rounded-[var(--r)] border border-border bg-card py-2 pl-8 pr-3 text-[13px] text-text placeholder:text-text-3 focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={urlPending}
                leftIcon={urlJustSaved ? <Check className="h-3.5 w-3.5" /> : undefined}
              >
                {urlPending ? "Saving…" : urlJustSaved ? "Saved" : "Save Link"}
              </Button>
            </form>
            {urlError && (
              <p className="mt-2 text-[11.5px] text-pb-red">{urlError}</p>
            )}
          </section>

          {/* ─── Availability slots ─── */}
          <section>
            <SectionHeading
              title="Weekly Availability"
              caption="Default hours for the team. Override per person inside a card."
            />

            <div className="mt-3 space-y-4">
              {slots.length === 0 ? (
                <EmptyState />
              ) : (
                <ul className="space-y-3">
                  {[...byMember.entries()].map(([memberId, mslots]) => {
                    const member = members.find((m) => m.id === memberId);
                    const displayName = member?.name ?? "All team members";
                    return (
                      <li key={memberId ?? "unassigned"}>
                        <div className="mb-1.5 flex items-center gap-2 text-[12px] font-semibold text-text-2">
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-pb-navy/10 text-[9px] font-bold text-pb-navy">
                            {displayName.slice(0, 1).toUpperCase()}
                          </span>
                          <span className="flex-1">{displayName}</span>
                          <button
                            type="button"
                            onClick={() =>
                              handleClearForUser(memberId, displayName)
                            }
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-text-2 transition-colors hover:bg-[rgba(219,25,36,0.08)] hover:text-pb-red"
                          >
                            <Trash2 className="h-3 w-3" />
                            Clear all
                          </button>
                        </div>
                        <ul className="overflow-hidden rounded-[var(--r)] border border-border bg-muted-bg/30">
                          {mslots.map((s, i) => (
                            <li
                              key={s.id}
                              className={`flex items-center justify-between px-3 py-2 text-[13px] ${
                                i !== 0 ? "border-t border-border" : ""
                              }`}
                            >
                              <span className="flex items-center gap-2 text-text">
                                <span className="inline-flex h-6 w-8 items-center justify-center rounded-full bg-card text-[10.5px] font-semibold text-text-2 ring-1 ring-border">
                                  {WEEKDAYS.find((d) => d.value === s.dayOfWeek)
                                    ?.label ?? s.dayOfWeek}
                                </span>
                                <span className="tabular-nums">
                                  {s.startTime} – {s.endTime}
                                </span>
                              </span>
                              <form onSubmit={handleDeleteSlot}>
                                <input type="hidden" name="id" value={s.id} />
                                <Button
                                  type="submit"
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Delete slot"
                                  className="hover:bg-[rgba(219,25,36,0.08)] hover:text-pb-red"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </form>
                            </li>
                          ))}
                        </ul>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Add-slot card */}
              <form
                ref={addSlotFormRef}
                onSubmit={handleAddSlot}
                className="rounded-[var(--r)] border border-dashed border-border bg-muted-bg/40 p-4"
              >
                <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold text-text-2">
                  <Plus className="h-3.5 w-3.5" />
                  Add a new slot
                </div>

                <div className="space-y-3">
                  {/* Member */}
                  <div>
                    <label className="mb-1 block text-[11.5px] font-medium text-text-2">
                      Applies to
                    </label>
                    <div className="relative">
                      <select
                        name="userId"
                        defaultValue=""
                        className="w-full appearance-none rounded-[var(--r)] border border-border bg-card px-3 py-2 pr-9 text-[13px] text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
                      >
                        <option value="">All team members</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-3" />
                    </div>
                  </div>

                  {/* Day pills */}
                  <div>
                    <label className="mb-1 block text-[11.5px] font-medium text-text-2">
                      Day of week
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {WEEKDAYS.map((d, idx) => (
                        <label
                          key={d.value}
                          className="cursor-pointer"
                          title={d.label}
                        >
                          <input
                            type="radio"
                            name="dayOfWeek"
                            value={d.value}
                            defaultChecked={idx === 0}
                            className="peer sr-only"
                          />
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-card text-[11.5px] font-semibold text-text-2 ring-1 ring-border transition-all hover:bg-muted-bg-2 peer-checked:bg-pb-navy peer-checked:text-white peer-checked:ring-pb-navy peer-focus-visible:ring-2 peer-focus-visible:ring-[rgba(2,29,64,0.25)]">
                            {d.short}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Times + submit */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <label className="mb-1 block text-[11.5px] font-medium text-text-2">
                        Start
                      </label>
                      <input
                        type="time"
                        name="startTime"
                        defaultValue="09:00"
                        className="w-full rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] tabular-nums text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="mb-1 block text-[11.5px] font-medium text-text-2">
                        End
                      </label>
                      <input
                        type="time"
                        name="endTime"
                        defaultValue="17:00"
                        className="w-full rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] tabular-nums text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
                      />
                    </div>
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      className="sm:self-end"
                      disabled={slotPending}
                      leftIcon={
                        slotJustSaved ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )
                      }
                    >
                      {slotPending
                        ? "Adding…"
                        : slotJustSaved
                          ? "Added"
                          : "Add Slot"}
                    </Button>
                  </div>
                  {slotError && (
                    <p className="mt-2 text-[11.5px] text-pb-red">
                      {slotError}
                    </p>
                  )}
                </div>
              </form>
            </div>
          </section>

          {/* ─── Info ─── */}
          <section>
            <div className="flex items-start gap-2.5 rounded-[var(--r)] border border-border bg-muted-bg/40 px-3.5 py-3">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-2" />
              <div className="text-[12.5px] leading-relaxed text-text-2">
                <div className="font-semibold text-text">
                  Individual Booking Links
                </div>
                {publicBookingUrl
                  ? "Each team member's card links to this base URL. Per-user links are coming soon."
                  : "Add availability slots above to generate individual booking links."}
              </div>
            </div>
          </section>
        </div>

        {/* ─── Footer ─── */}
        <div className="flex justify-end gap-2 border-t border-border bg-muted-bg/30 px-6 py-3.5">
          <Button
            variant="primary"
            size="md"
            onClick={onClose}
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Pieces ───────────────────────────────────────────────────
function SectionHeading({
  title,
  caption,
}: {
  title: string;
  caption: string;
}) {
  return (
    <div>
      <h3 className="text-[13px] font-semibold text-text">{title}</h3>
      <p className="mt-0.5 text-[12px] text-text-2">{caption}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--r)] border border-dashed border-border bg-muted-bg/30 px-4 py-8 text-center">
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-card ring-1 ring-border">
        <CalendarDays className="h-4 w-4 text-text-2" />
      </div>
      <p className="text-[13px] font-semibold text-text">
        No Availability Set
      </p>
      <p className="mt-0.5 text-[12px] text-text-2">
        Add your first slot below.
      </p>
    </div>
  );
}
