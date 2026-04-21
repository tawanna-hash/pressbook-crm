import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import {
  Clock,
  MapPin,
  User as UserIcon,
} from "lucide-react";
import { db } from "@/lib/db";
import {
  availabilitySlots,
  bookingOrgSettings,
  calendarEvents,
  users,
} from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";
import { AvailabilityModalButton } from "./availability-modal";
import { BookTimeButton } from "./book-time-button";
import {
  ClearMemberAvailabilityButton,
  DeleteMemberButton,
} from "./clear-member-availability-button";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ member?: string }>;

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatTimeShort(d: Date): string {
  return d
    .toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(" ", "")
    .toLowerCase();
}

function formatDayShort(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

/**
 * Expand weekly availability rows into the next N concrete slot start
 * times, skipping past slots and already-booked start times. Used to show
 * "next available" chips as a preview on each card.
 */
function computeNextAvailable(
  availability: { dayOfWeek: number; startTime: string; endTime: string }[],
  durationMinutes: number,
  bookedIsos: Set<string>,
  limit: number,
): Date[] {
  if (availability.length === 0) return [];
  const slots: Date[] = [];
  const now = new Date();
  const base = new Date(now);
  base.setHours(0, 0, 0, 0);

  for (let i = 0; i < 14 && slots.length < limit; i++) {
    const day = new Date(base);
    day.setDate(base.getDate() + i);
    const dow = day.getDay();
    const rows = availability.filter((a) => a.dayOfWeek === dow);
    for (const row of rows) {
      const [sh, sm] = row.startTime.split(":").map(Number);
      const [eh, em] = row.endTime.split(":").map(Number);
      const dayStart = new Date(day);
      dayStart.setHours(sh ?? 0, sm ?? 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(eh ?? 0, em ?? 0, 0, 0);
      for (
        let cursor = new Date(dayStart);
        cursor.getTime() + durationMinutes * 60_000 <= dayEnd.getTime() &&
        slots.length < limit;
        cursor = new Date(cursor.getTime() + durationMinutes * 60_000)
      ) {
        if (cursor.getTime() < now.getTime()) continue;
        if (bookedIsos.has(cursor.toISOString())) continue;
        slots.push(new Date(cursor));
      }
    }
  }
  return slots;
}

/**
 * Collapse rows that refer to the same person by normalized name.
 * When the same name appears more than once in an org (e.g. a real
 * Clerk-synced row + a demo seed row), prefer the non-demo row so the
 * real user wins. Keeps first-seen otherwise.
 */
function dedupeByName<T extends { name: string; clerkId: string | null }>(
  rows: T[],
): T[] {
  const byKey = new Map<string, T>();
  for (const row of rows) {
    const key = row.name.trim().toLowerCase();
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, row);
      continue;
    }
    const existingIsDemo = existing.clerkId?.startsWith("demo_") ?? false;
    const incomingIsDemo = row.clerkId?.startsWith("demo_") ?? false;
    if (existingIsDemo && !incomingIsDemo) {
      byKey.set(key, row);
    }
  }
  return Array.from(byKey.values());
}

export default async function BookingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { member } = await searchParams;
  const activeOrg = await getActiveOrg();

  if (!activeOrg) {
    return (
      <div className="rounded-[var(--rlg)] border border-border bg-card p-12 text-center">
        <p className="text-[13px] text-text-2">
          Pick a company in the sidebar.
        </p>
      </div>
    );
  }

  const [teamMembers, slots, orgSettings] = await Promise.all([
    db
      .select()
      .from(users)
      .where(eq(users.orgId, activeOrg.id))
      .orderBy(asc(users.name)),
    db
      .select()
      .from(availabilitySlots)
      .where(eq(availabilitySlots.orgId, activeOrg.id)),
    db
      .select()
      .from(bookingOrgSettings)
      .where(eq(bookingOrgSettings.orgId, activeOrg.id))
      .limit(1),
  ]);

  const publicBookingUrl = orgSettings[0]?.publicBookingUrl ?? null;

  // Collapse duplicate rows (e.g. demo seed + real Clerk-synced user with
  // the same name) so each person shows exactly once in pills and cards.
  const uniqueMembers = dedupeByName(teamMembers);

  const filteredMembers = member
    ? uniqueMembers.filter((m) => m.id === member)
    : uniqueMembers;

  // ── Existing bookings for conflict-detection ──
  // Pull any calendar_events in the next 14 days whose agent_email matches
  // one of our members — those start times get hidden from the BookTime
  // modal's slot list so nobody books a slot that's already taken.
  const now = new Date();
  const in14 = new Date(now);
  in14.setDate(in14.getDate() + 14);
  const memberEmails = uniqueMembers.map((m) => m.email);
  const bookedRows = memberEmails.length
    ? await db
        .select({
          agentEmail: calendarEvents.agentEmail,
          date: calendarEvents.date,
        })
        .from(calendarEvents)
        .where(
          and(
            eq(calendarEvents.orgId, activeOrg.id),
            inArray(calendarEvents.agentEmail, memberEmails),
            gte(calendarEvents.date, now),
            lt(calendarEvents.date, in14),
          ),
        )
    : [];

  const bookedByEmail = new Map<string, string[]>();
  for (const r of bookedRows) {
    if (!r.agentEmail) continue;
    const arr = bookedByEmail.get(r.agentEmail) ?? [];
    arr.push(r.date.toISOString());
    bookedByEmail.set(r.agentEmail, arr);
  }

  // Prefill name + email on the booking modal when the viewer is a staff
  // member (useful when staff book each other).
  const clerkUser = await currentUser();
  const viewerDefaults = clerkUser
    ? {
        name:
          [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
          null,
        email:
          clerkUser.emailAddresses.find(
            (e) => e.id === clerkUser.primaryEmailAddressId,
          )?.emailAddress ?? null,
      }
    : { name: null, email: null };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-text">Booking</h1>
        <p className="mt-0.5 text-[13px] text-text-2">
          Schedule time with the team
        </p>
      </div>

      {/* Availability trigger (filter pills removed) */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <AvailabilityModalButton
          orgName={activeOrg.name}
          publicBookingUrl={publicBookingUrl}
          slots={slots.map((s) => ({
            id: s.id,
            userId: s.userId,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
          }))}
          members={uniqueMembers.map((m) => ({ id: m.id, name: m.name }))}
        />
      </div>

      {/* Cards */}
      {filteredMembers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[var(--rlg)] border border-border bg-card px-6 py-20 shadow-[var(--sh-xs)]">
          <div
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-[var(--r)]"
            style={{ backgroundColor: "var(--muted-bg-2)" }}
          >
            <UserIcon className="h-6 w-6 text-text-2" />
          </div>
          <h2 className="mb-1 text-[15px] font-semibold text-text">
            No Team Members Yet
          </h2>
          <p className="text-[12.5px] text-text-2">
            Add a team member in Settings to enable bookings.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMembers.map((m) => {
            const memberSlots = slots.filter(
              (s) => s.userId === m.id || s.userId === null,
            );
            const hasAvailability = memberSlots.length > 0;
            const duration = m.meetingDurationMinutes ?? 30;
            const location = m.meetingLocation ?? "Austin, TX";
            const alreadyBooked = bookedByEmail.get(m.email) ?? [];
            return (
              <div
                key={m.id}
                className="group/card flex flex-col rounded-[var(--rlg)] border border-border bg-card p-5 shadow-[var(--sh-xs)] transition-shadow hover:shadow-[var(--sh-sm)]"
              >
                {/* Top: avatar + name + delete */}
                <div className="mb-3 flex items-start gap-3">
                  {m.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.avatarUrl}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-border"
                    />
                  ) : (
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white ring-2 ring-border"
                      style={{ backgroundColor: "var(--pb-navy)" }}
                    >
                      {initialsOf(m.name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="truncate text-[15px] font-semibold text-text">
                      {m.name}
                    </div>
                    <div className="truncate text-[11.5px] text-text-2">
                      {m.email}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-text-2">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {duration} min
                      </span>
                      <span className="text-text-3">·</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {location}
                      </span>
                    </div>
                  </div>
                  <div className="opacity-0 transition-opacity group-hover/card:opacity-100">
                    <DeleteMemberButton
                      memberId={m.id}
                      memberName={m.name}
                    />
                  </div>
                </div>

                {/* Availability status + next-slot preview */}
                {(() => {
                  const bookedSet = new Set(alreadyBooked);
                  const availRows = memberSlots.map((s) => ({
                    dayOfWeek: s.dayOfWeek,
                    startTime: s.startTime,
                    endTime: s.endTime,
                  }));
                  const nextSlots = computeNextAvailable(
                    availRows.length > 0
                      ? availRows
                      : [1, 2, 3, 4, 5].map((d) => ({
                          dayOfWeek: d,
                          startTime: "09:00",
                          endTime: "17:00",
                        })),
                    duration,
                    bookedSet,
                    3,
                  );
                  const usingDefault = availRows.length === 0;

                  return (
                    <div className="mb-4 rounded-[var(--r)] border border-border bg-muted-bg/30 px-3 py-2.5">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-text-2">
                          Next available
                        </span>
                        {!hasAvailability && (
                          <span className="rounded-full bg-muted-bg-2 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase text-text-2">
                            Default hours
                          </span>
                        )}
                      </div>
                      {nextSlots.length === 0 ? (
                        <p className="text-[12px] italic text-text-3">
                          No upcoming slots
                        </p>
                      ) : (
                        <>
                          <div className="mb-1 text-[12px] font-medium text-text">
                            {formatDayShort(nextSlots[0])} at{" "}
                            {formatTimeShort(nextSlots[0])}
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {nextSlots.map((s) => (
                              <span
                                key={s.toISOString()}
                                className="inline-flex rounded-full bg-card px-2 py-0.5 text-[10.5px] font-medium text-text-2 ring-1 ring-border"
                              >
                                {formatTimeShort(s)}
                              </span>
                            ))}
                          </div>
                          {usingDefault && (
                            <p className="mt-1.5 text-[10.5px] text-text-3">
                              Using default Mon–Fri 9–5 until hours are set.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* Primary action */}
                <BookTimeButton
                  memberId={m.id}
                  memberName={m.name}
                  memberEmail={m.email}
                  durationMinutes={duration}
                  location={location}
                  availability={memberSlots.map((s) => ({
                    dayOfWeek: s.dayOfWeek,
                    startTime: s.startTime,
                    endTime: s.endTime,
                  }))}
                  bookedStartAtIsos={alreadyBooked}
                  viewerName={viewerDefaults.name}
                  viewerEmail={viewerDefaults.email}
                />

                {/* Tertiary actions — subtle footer row */}
                <div className="mt-3 flex items-center justify-between text-[11.5px]">
                  <ClearMemberAvailabilityButton
                    memberId={m.id}
                    memberName={m.name}
                  />
                  {(m.publicBookingUrl ?? publicBookingUrl) && (
                    <a
                      href={m.publicBookingUrl ?? publicBookingUrl ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-text-2 hover:text-pb-navy hover:underline"
                    >
                      External link ↗
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

