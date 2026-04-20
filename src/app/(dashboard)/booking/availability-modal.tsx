"use client";

import { useState } from "react";
import { Clock, Copy, Plus, Trash2, X } from "lucide-react";
import {
  addAvailabilitySlot,
  deleteAvailabilitySlot,
  saveOrgBookingUrl,
} from "./actions";

const WEEKDAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-[var(--r)] border border-border bg-card px-3.5 py-2 text-[13px] font-medium text-text shadow-[var(--sh-xs)] transition-colors hover:bg-muted-bg"
      >
        <Clock className="h-3.5 w-3.5" />
        Availability &amp; Links
      </button>
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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div className="w-full max-w-2xl rounded-[var(--rlg)] bg-card shadow-[var(--sh-lg)]">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Clock className="h-4 w-4 text-pb-navy" />
            <h2 className="text-base font-semibold text-text">
              Availability &amp; Booking Links — {orgName}
            </h2>
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

        <div className="space-y-6 px-6 py-5">
          {/* Public URL */}
          <section>
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-2">
              {orgName} Public Booking Link
            </h3>
            <form
              action={saveOrgBookingUrl}
              className="flex items-center gap-2"
            >
              <input
                type="url"
                name="publicBookingUrl"
                defaultValue={publicBookingUrl ?? ""}
                placeholder="https://calendly.com/yourname or similar"
                className="flex-1 rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-[var(--r)] border border-border bg-card px-3.5 py-2 text-[12.5px] font-medium text-text hover:bg-muted-bg"
              >
                <Copy className="h-3.5 w-3.5" />
                Save
              </button>
            </form>
          </section>

          {/* Availability Slots */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-text-2">
                Availability Slots
              </h3>
            </div>
            {slots.length === 0 ? (
              <p className="rounded-[var(--r)] border border-dashed border-border px-3 py-4 text-center text-[12.5px] text-text-2">
                No availability slots yet. Add one below.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {[...byMember.entries()].map(([memberId, mslots]) => {
                  const member = members.find((m) => m.id === memberId);
                  return (
                    <li key={memberId ?? "unassigned"}>
                      <div className="mb-1 text-[11px] font-semibold text-text-2">
                        {member?.name ?? "All team members"}
                      </div>
                      <ul className="divide-y divide-border rounded-[var(--r)] border border-border">
                        {mslots.map((s) => (
                          <li
                            key={s.id}
                            className="flex items-center justify-between px-3 py-2 text-[13px]"
                          >
                            <span className="text-text">
                              {WEEKDAYS.find((d) => d.value === s.dayOfWeek)?.label ??
                                s.dayOfWeek}{" "}
                              · {s.startTime} – {s.endTime}
                            </span>
                            <form action={deleteAvailabilitySlot}>
                              <input type="hidden" name="id" value={s.id} />
                              <button
                                type="submit"
                                aria-label="Delete slot"
                                className="rounded-full p-1 text-text-2 hover:bg-[rgba(219,25,36,0.08)] hover:text-pb-red"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </form>
                          </li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            )}

            <form
              action={addAvailabilitySlot}
              className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1.2fr,0.8fr,0.8fr,0.8fr,auto]"
            >
              <select
                name="userId"
                defaultValue=""
                className="rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
              >
                <option value="">All team members</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <select
                name="dayOfWeek"
                defaultValue="1"
                className="rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
              >
                {WEEKDAYS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
              <input
                type="time"
                name="startTime"
                defaultValue="09:00"
                className="rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
              />
              <input
                type="time"
                name="endTime"
                defaultValue="17:00"
                className="rounded-[var(--r)] border border-border bg-card px-3 py-2 text-[13px] text-text focus:border-pb-navy focus:outline-none focus:ring-2 focus:ring-[rgba(2,29,64,0.15)]"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 rounded-[var(--r)] bg-pb-navy px-3.5 py-2 text-[12.5px] font-semibold text-white hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Slot
              </button>
            </form>
          </section>

          <section>
            <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-2">
              Individual Booking Links
            </h3>
            <p className="text-[12.5px] text-text-2">
              {publicBookingUrl
                ? "Each team member's booking card links to this base URL. Per-user links coming next session."
                : "Add availability slots above to generate individual booking links."}
            </p>
          </section>
        </div>

        <div className="flex justify-end border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--r)] border border-border bg-card px-4 py-2 text-[13px] font-medium text-text transition-colors hover:bg-muted-bg"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
