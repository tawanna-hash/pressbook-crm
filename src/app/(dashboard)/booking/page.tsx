import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import {
  Calendar,
  Check,
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

      {/* Filter + Availability */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterPill
            href="/booking"
            isActive={!member}
            label="All Team Members"
            showCheck
          />
          <span className="text-text-3">|</span>
          {uniqueMembers.map((m) => (
            <FilterPill
              key={m.id}
              href={`/booking?member=${m.id}`}
              isActive={member === m.id}
              label={m.name.split(" ")[0]}
              initials={initialsOf(m.name)}
            />
          ))}
        </div>
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
                className="flex flex-col rounded-[var(--rlg)] border border-border bg-card p-5 shadow-[var(--sh-xs)]"
              >
                <div className="mb-4 flex items-center gap-3">
                  {m.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.avatarUrl}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-text-2"
                      style={{ backgroundColor: "var(--muted-bg-2)" }}
                    >
                      {initialsOf(m.name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold text-text">
                      {m.name}
                    </div>
                    <div className="truncate text-[12px] text-text-2">
                      {m.email}
                    </div>
                  </div>
                </div>

                <ul className="mb-4 space-y-1.5 text-[12.5px] text-text-2">
                  <li className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    {duration} min meeting
                  </li>
                  <li className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span className={hasAvailability ? "text-text" : "italic"}>
                      {hasAvailability
                        ? `${memberSlots.length} availability slot${memberSlots.length === 1 ? "" : "s"}`
                        : "No availability set"}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {location}
                  </li>
                </ul>

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
                {/* Legacy Calendly-style URL support — still shown as an extra
                    link for anyone who prefers the external host. */}
                {(m.publicBookingUrl ?? publicBookingUrl) && (
                  <a
                    href={m.publicBookingUrl ?? publicBookingUrl ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center justify-center gap-1 text-[11.5px] font-medium text-pb-navy hover:underline"
                  >
                    Or open external link
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Pieces ───────────────────────────────────────────────────
function FilterPill({
  href,
  isActive,
  label,
  initials,
  showCheck,
}: {
  href: string;
  isActive: boolean;
  label: string;
  initials?: string;
  showCheck?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
        isActive
          ? "bg-pb-navy text-white"
          : "bg-muted-bg text-text-2 hover:bg-muted-bg-2 hover:text-text"
      }`}
    >
      {showCheck && isActive && <Check className="h-3 w-3" />}
      {initials && (
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
            isActive
              ? "bg-white/15 text-white"
              : "bg-muted-bg-2 text-text-2"
          }`}
        >
          {initials}
        </span>
      )}
      {label}
    </Link>
  );
}
