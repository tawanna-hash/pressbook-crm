import { and, asc, count, desc, eq, gte, isNotNull, lt } from "drizzle-orm";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  Clock,
  Import,
  MapPin,
  Plus,
  Settings,
  Trash2,
  Users,
  Vote,
} from "lucide-react";
import { db } from "@/lib/db";
import { calendarEvents, contacts, users } from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";
import { AddAppointmentForm } from "./add-appointment-form";
import { deleteAppointment } from "./actions";

export const dynamic = "force-dynamic";

// ─── helpers ──────────────────────────────────────────────────
function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}
function daysFromNow(n: number): Date {
  const out = new Date();
  out.setDate(out.getDate() + n);
  return out;
}
function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
function formatDay(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}
const WEEK_DAY_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

// ─── component ────────────────────────────────────────────────
export default async function CalendarlyPage() {
  const activeOrg = await getActiveOrg();

  const now = new Date();
  const in7  = daysFromNow(7);
  const in30 = daysFromNow(30);
  const ago30 = daysFromNow(-30);

  const orgScope = activeOrg
    ? and(eq(calendarEvents.orgId, activeOrg.id), isNotNull(calendarEvents.contactId))
    : isNotNull(calendarEvents.contactId);

  // KPI counts — three parallel queries so Drizzle handles Date serialisation.
  const [thisWeekRow, thisMonthRow, past30Row] = await Promise.all([
    db
      .select({ c: count() })
      .from(calendarEvents)
      .where(and(orgScope, gte(calendarEvents.date, now), lt(calendarEvents.date, in7))),
    db
      .select({ c: count() })
      .from(calendarEvents)
      .where(and(orgScope, gte(calendarEvents.date, now), lt(calendarEvents.date, in30))),
    db
      .select({ c: count() })
      .from(calendarEvents)
      .where(and(orgScope, gte(calendarEvents.date, ago30), lt(calendarEvents.date, now))),
  ]);
  const counts = {
    thisWeek:  thisWeekRow[0]?.c  ?? 0,
    thisMonth: thisMonthRow[0]?.c ?? 0,
    past30:    past30Row[0]?.c    ?? 0,
  };

  // Upcoming list
  const upcoming = await db
    .select({
      id:              calendarEvents.id,
      title:           calendarEvents.title,
      date:            calendarEvents.date,
      durationMinutes: calendarEvents.durationMinutes,
      location:        calendarEvents.location,
      type:            calendarEvents.type,
      notes:           calendarEvents.notes,
      contactId:       calendarEvents.contactId,
      clientFirstName: contacts.firstName,
      clientLastName:  contacts.lastName,
      clientCompany:   contacts.company,
      clientAvatarUrl: contacts.avatarUrl,
    })
    .from(calendarEvents)
    .leftJoin(contacts, eq(contacts.id, calendarEvents.contactId))
    .where(and(orgScope, gte(calendarEvents.date, now)))
    .orderBy(asc(calendarEvents.date))
    .limit(25);

  // Past (small secondary list below)
  const past = await db
    .select({
      id:              calendarEvents.id,
      title:           calendarEvents.title,
      date:            calendarEvents.date,
      type:            calendarEvents.type,
      clientFirstName: contacts.firstName,
      clientLastName:  contacts.lastName,
    })
    .from(calendarEvents)
    .leftJoin(contacts, eq(contacts.id, calendarEvents.contactId))
    .where(and(orgScope, lt(calendarEvents.date, now)))
    .orderBy(desc(calendarEvents.date))
    .limit(6);

  // Client dropdown for the "add appointment" form
  const clientList = activeOrg
    ? await db
        .select({
          id: contacts.id,
          firstName: contacts.firstName,
          lastName: contacts.lastName,
          company: contacts.company,
        })
        .from(contacts)
        .where(and(eq(contacts.orgId, activeOrg.id), eq(contacts.type, "client")))
        .orderBy(asc(contacts.firstName))
        .limit(500)
    : [];

  const clientOptions = clientList.map((c) => ({
    id: c.id,
    name:
      [c.firstName, c.lastName].filter(Boolean).join(" ") +
      (c.company ? ` — ${c.company}` : ""),
  }));

  // Team panel — users in this org
  const team = activeOrg
    ? await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(eq(users.orgId, activeOrg.id))
        .limit(8)
    : [];

  // Weekly strip — Monday through Sunday of this week, with a count per day
  const startOfWeek = (() => {
    const d = startOfDay(new Date());
    const dayIdx = (d.getDay() + 6) % 7; // Mon = 0
    d.setDate(d.getDate() - dayIdx);
    return d;
  })();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    const count = upcoming.filter(
      (a) =>
        startOfDay(a.date).getTime() === day.getTime(),
    ).length;
    return { day, count };
  });

  // KPI card definitions
  const KPIS = [
    { icon: Calendar,      value: counts?.thisWeek  ?? 0, label: "This Week",   sub: "next 7 days" },
    { icon: Clock,         value: counts?.thisMonth ?? 0, label: "This Month",  sub: "next 30 days" },
    { icon: CalendarCheck, value: counts?.past30    ?? 0, label: "Past 30 Days", sub: "completed" },
    { icon: Settings,      value: 0, label: "Event Types", sub: "0 total" },
    { icon: Vote,          value: 0, label: "Open Polls",  sub: "0 total" },
    { icon: Users,         value: `0/${team.length || 6}`, label: "Team Ready", sub: "with availability" },
  ];

  // Quick Action buttons — each triggers the Add Appointment form or will
  // link to future pages.
  const QUICK = [
    { icon: Plus,          label: "New Appointment", href: "#add-appointment" },
    { icon: Settings,      label: "New Event Type",  href: "#"  },
    { icon: Users,         label: "New Meeting Poll", href: "#" },
    { icon: Clock,         label: "Set Availability", href: "#" },
    { icon: Import,        label: "Import Calendar",  href: "#" },
    { icon: Calendar,      label: "Full Calendar",    href: "/calendar" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">
            {activeOrg ? `${activeOrg.name} Calendarly` : "Calendarly"}
          </h1>
          <p className="mt-0.5 text-[13px] text-text-2">
            Both companies — scheduling overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-[var(--r)] border border-[color:var(--border-strong,var(--border))] bg-card px-3.5 py-2 text-[13px] font-medium text-text shadow-[var(--sh-xs)] transition-colors hover:bg-muted-bg"
          >
            <Settings className="h-3.5 w-3.5" />
            Scheduling
          </button>
          <Link
            href="#add-appointment"
            className="inline-flex items-center gap-1.5 rounded-[var(--r)] bg-pb-navy px-3.5 py-2 text-[13px] font-semibold text-white shadow-[var(--sh-xs)] transition-opacity hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            New Appointment
          </Link>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {KPIS.map((k) => {
          const Icon = k.icon;
          return (
            <div
              key={k.label}
              className="flex flex-col gap-2 rounded-[var(--rlg)] border border-border bg-card p-4 shadow-[var(--sh-xs)]"
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-[var(--r)]"
                style={{ backgroundColor: "var(--muted-bg-2, rgba(50, 58, 70, .07))" }}
              >
                <Icon className="h-4 w-4 text-text-2" />
              </div>
              <div className="text-2xl font-bold text-text">{k.value}</div>
              <div>
                <div className="text-[12px] font-semibold text-text">{k.label}</div>
                <div className="text-[11px] text-text-2">{k.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* This Week */}
      <div className="rounded-[var(--rlg)] border border-border bg-card shadow-[var(--sh-xs)]">
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <h2 className="text-[15px] font-semibold text-text">This Week</h2>
          <Link
            href="/calendar"
            className="inline-flex items-center gap-1 text-[12px] font-medium text-pb-navy transition-opacity hover:opacity-70"
          >
            Full Calendar
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-7 gap-2 p-4 pt-0">
          {weekDays.map(({ day, count }) => {
            const selected = isToday(day);
            const label = count === 0 ? "Free" : `${count} appt${count === 1 ? "" : "s"}`;
            return (
              <div
                key={day.toISOString()}
                className={`flex flex-col items-center gap-1 rounded-[var(--r)] border px-2 py-3 transition-colors ${
                  selected
                    ? "border-border-strong bg-muted-bg"
                    : "border-border bg-surface-2"
                }`}
              >
                <div className="text-[10px] font-semibold uppercase tracking-wider text-text-2">
                  {WEEK_DAY_SHORT[day.getDay()]}
                </div>
                <div className="text-xl font-bold text-text">{day.getDate()}</div>
                <div className={`text-[11px] ${count === 0 ? "text-text-2" : "text-pb-navy font-semibold"}`}>
                  {label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-[var(--rlg)] border border-border bg-card shadow-[var(--sh-xs)]">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-[15px] font-semibold text-text">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 lg:grid-cols-6">
          {QUICK.map((q) => {
            const Icon = q.icon;
            return (
              <Link
                key={q.label}
                href={q.href}
                className="inline-flex items-center gap-2 rounded-[var(--r)] border border-border bg-surface-2 px-3 py-2.5 text-[12.5px] font-medium text-text transition-colors hover:bg-muted-bg"
              >
                <Icon className="h-3.5 w-3.5 text-text-2" />
                <span className="truncate">{q.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Upcoming Appointments + Team — two columns */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Upcoming */}
        <div className="rounded-[var(--rlg)] border border-border bg-card shadow-[var(--sh-xs)] lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="text-[15px] font-semibold text-text">
              Upcoming Appointments
            </h2>
            <Link
              href="#add-appointment"
              className="inline-flex items-center gap-1.5 rounded-[var(--r)] bg-pb-navy px-3 py-1.5 text-[12px] font-semibold text-white shadow-[var(--sh-xs)] transition-opacity hover:opacity-90"
            >
              <Plus className="h-3 w-3" />
              New
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <CalendarPlus className="mb-3 h-7 w-7 text-text-3" />
              <p className="text-[13px] text-text-2">
                No upcoming appointments —{" "}
                <a
                  href="#add-appointment"
                  className="font-medium text-pb-navy hover:opacity-70"
                >
                  schedule one
                </a>
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.map((appt) => {
                const clientName =
                  [appt.clientFirstName, appt.clientLastName]
                    .filter(Boolean)
                    .join(" ") || "—";
                const initials = (
                  (appt.clientFirstName?.[0] ?? "") +
                  (appt.clientLastName?.[0] ?? "")
                ).toUpperCase();
                const today = isToday(appt.date);
                return (
                  <li
                    key={appt.id}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted-bg"
                  >
                    <div className="w-16 shrink-0 text-center">
                      <div
                        className={`text-[10px] font-semibold uppercase ${
                          today ? "text-pb-red" : "text-text-2"
                        }`}
                      >
                        {today ? "Today" : formatDay(appt.date)}
                      </div>
                      <div className="mt-0.5 text-sm font-bold text-text">
                        {formatTime(appt.date)}
                      </div>
                    </div>
                    {appt.clientAvatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={appt.clientAvatarUrl}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-pb-navy"
                        style={{ backgroundColor: "var(--muted-bg-2, rgba(2, 29, 64, 0.08))" }}
                      >
                        {initials || "?"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-text">
                        {appt.title}
                      </div>
                      <div className="truncate text-[12px] text-text-2">
                        with{" "}
                        {appt.contactId ? (
                          <Link
                            href={`/clients/${appt.contactId}`}
                            className="font-medium text-text hover:underline"
                          >
                            {clientName}
                          </Link>
                        ) : (
                          <span className="font-medium text-text">{clientName}</span>
                        )}
                        {appt.type && ` · ${appt.type}`}
                        {appt.location && (
                          <>
                            {" · "}
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {appt.location}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <form action={deleteAppointment} className="shrink-0">
                      <input type="hidden" name="id" value={appt.id} />
                      <button
                        type="submit"
                        aria-label="Cancel"
                        className="rounded-full p-1.5 text-text-2 transition-colors hover:bg-[rgba(219,25,36,0.08)] hover:text-pb-red"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}

          {past.length > 0 && (
            <div className="border-t border-border bg-muted-bg px-5 py-3">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-2">
                <Clock className="h-3 w-3" />
                Recent past
              </div>
              <ul className="space-y-1">
                {past.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 text-[12px] text-text-2"
                  >
                    <span className="w-28 shrink-0">{formatDay(p.date)}</span>
                    <span className="truncate text-text">{p.title}</span>
                    <span className="truncate">
                      {[p.clientFirstName, p.clientLastName]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Team */}
        <div className="rounded-[var(--rlg)] border border-border bg-card shadow-[var(--sh-xs)]">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h2 className="text-[15px] font-semibold text-text">Team</h2>
            <Link
              href="/settings"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-pb-navy transition-opacity hover:opacity-70"
            >
              Manage
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {team.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
              <Users className="mb-2 h-6 w-6 text-text-3" />
              <p className="text-[12.5px] text-text-2">
                No team members yet for this company.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {team.map((m) => {
                const initials = m.name
                  .split(" ")
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                return (
                  <li
                    key={m.id}
                    className="flex items-center gap-3 px-5 py-3"
                  >
                    {m.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.avatarUrl}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-pb-navy"
                        style={{ backgroundColor: "var(--muted-bg-2, rgba(2, 29, 64, 0.08))" }}
                      >
                        {initials || "?"}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-semibold text-text">
                          {m.name}
                        </span>
                        {activeOrg && (
                          <span
                            className="rounded-[var(--r)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-white"
                            style={{ backgroundColor: activeOrg.brandColor }}
                          >
                            {activeOrg.slug === "realtyline" ? "RL" : "NL"}
                          </span>
                        )}
                      </div>
                      <div className="truncate text-[11px] text-text-2">
                        No availability set
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-[rgba(255,199,0,0.12)] px-2 py-0.5 text-[10px] font-semibold text-[color:#8a6900]">
                      Setup needed
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Add Appointment form (anchor target) */}
      <div id="add-appointment" className="scroll-mt-20">
        <AddAppointmentForm clients={clientOptions} />
      </div>
    </div>
  );
}
