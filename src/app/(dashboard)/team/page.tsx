import { and, asc, desc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import {
  CalendarDays,
  Calendar as CalendarIcon,
  LayoutGrid,
  List,
  MapPin,
  Square,
  Trash2,
} from "lucide-react";
import { db } from "@/lib/db";
import { calendarEvents, contacts, organizations } from "@/lib/db/schema";
import { getActiveOrg, listOrgs } from "@/lib/auth/active-org";
import { NewTeamEventButton } from "./new-event-button";
import { ImportTeamCalendarButton } from "./import-button";
import { deleteTeamEvent } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ view?: string; co?: string }>;

function formatDateRange(start: Date, end: Date | null): string {
  const dateOpts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };
  const sameDay = !end || start.toDateString() === end.toDateString();
  const startStr = `${start.toLocaleDateString(undefined, dateOpts)}, ${start.toLocaleTimeString(undefined, timeOpts)}`;
  if (sameDay && end) {
    return `${startStr} – ${end.toLocaleTimeString(undefined, timeOpts)}`;
  }
  if (end) {
    return `${startStr} → ${end.toLocaleDateString(undefined, dateOpts)}, ${end.toLocaleTimeString(undefined, timeOpts)}`;
  }
  return startStr;
}

export default async function TeamCalendarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { view, co } = await searchParams;
  const isListView = view === "list";
  const isCalendarView = view === "calendar";

  const orgs = await listOrgs();
  const active = await getActiveOrg();

  // Which orgs are we showing? `co=rl` → only realtyline; `co=nl` → newsline;
  // otherwise both.
  const filterSlug = co === "realtyline" ? "realtyline" : co === "newsline" ? "newsline" : null;
  const filterOrgs = filterSlug
    ? orgs.filter((o) => o.slug === filterSlug)
    : orgs;

  const filterOrgIds = filterOrgs.map((o) => o.id);

  const events = filterOrgIds.length > 0
    ? await db
        .select({
          id:         calendarEvents.id,
          title:      calendarEvents.title,
          date:       calendarEvents.date,
          endDate:    calendarEvents.endDate,
          location:   calendarEvents.location,
          type:       calendarEvents.type,
          notes:      calendarEvents.notes,
          clientName: calendarEvents.clientName,
          agentEmail: calendarEvents.agentEmail,
          orgId:      calendarEvents.orgId,
          contactId:  calendarEvents.contactId,
          // Display the linked contact's info if present.
          contactFirstName: contacts.firstName,
          contactLastName:  contacts.lastName,
        })
        .from(calendarEvents)
        .leftJoin(contacts, eq(contacts.id, calendarEvents.contactId))
        .where(inArray(calendarEvents.orgId, filterOrgIds))
        .orderBy(desc(calendarEvents.date))
        .limit(200)
    : [];

  // Count per org for the header
  const counts = filterOrgs.map((o) => ({
    slug: o.slug,
    count: events.filter((e) => e.orgId === o.id).length,
    brandColor: o.brandColor,
    name: o.name,
  }));

  const rlBadge =
    orgs.find((o) => o.slug === "realtyline") ?? { name: "RealtyLine", brandColor: "#021D40" };
  const nlBadge =
    orgs.find((o) => o.slug === "newsline") ?? { name: "Newsline SA", brandColor: "#3D0740" };

  const rlCount = events.filter((e) => e.orgId === (orgs.find((o) => o.slug === "realtyline")?.id ?? "")).length;
  const nlCount = events.filter((e) => e.orgId === (orgs.find((o) => o.slug === "newsline")?.id ?? "")).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Team Calendar</h1>
          <p className="mt-0.5 text-[13px] text-text-2">
            {filterSlug ? (
              <>
                {filterOrgs[0]?.name} — {counts[0]?.count ?? 0}{" "}
                {(counts[0]?.count ?? 0) === 1 ? "event" : "events"}
              </>
            ) : (
              <>
                Both companies —{" "}
                <span
                  className="font-semibold"
                  style={{ color: rlBadge.brandColor }}
                >
                  {rlCount} RL
                </span>{" "}
                +{" "}
                <span
                  className="font-semibold"
                  style={{ color: nlBadge.brandColor }}
                >
                  {nlCount} NL
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* View toggle */}
          <div className="inline-flex items-center overflow-hidden rounded-[var(--r)] border border-border bg-card shadow-[var(--sh-xs)]">
            <Link
              href={
                filterSlug
                  ? `/team?view=calendar&co=${filterSlug}`
                  : "/team?view=calendar"
              }
              className={`flex items-center gap-1 px-3 py-2 text-[12.5px] transition-colors ${
                isCalendarView
                  ? "bg-pb-navy text-white"
                  : "text-text-2 hover:bg-muted-bg"
              }`}
              aria-label="Calendar view"
            >
              <CalendarIcon className="h-3.5 w-3.5" />
            </Link>
            <Link
              href={
                filterSlug
                  ? `/team?view=list&co=${filterSlug}`
                  : "/team?view=list"
              }
              className={`flex items-center gap-1 px-3 py-2 text-[12.5px] transition-colors ${
                isListView
                  ? "bg-pb-navy text-white"
                  : "text-text-2 hover:bg-muted-bg"
              }`}
              aria-label="List view"
            >
              <List className="h-3.5 w-3.5" />
            </Link>
            <Link
              href={filterSlug ? `/team?co=${filterSlug}` : "/team"}
              className={`flex items-center gap-1 px-3 py-2 text-[12.5px] transition-colors ${
                !isListView && !isCalendarView
                  ? "bg-pb-navy text-white"
                  : "text-text-2 hover:bg-muted-bg"
              }`}
              aria-label="Cards view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Link>
          </div>

          <ImportTeamCalendarButton />
          <NewTeamEventButton
            orgs={orgs.map((o) => ({
              slug: o.slug,
              name: o.name,
              brandColor: o.brandColor,
            }))}
            defaultOrgSlug={active?.slug ?? orgs[0]?.slug ?? ""}
          />
        </div>
      </div>

      {/* Company pill filter */}
      <div className="inline-flex items-center gap-1.5">
        <CompanyPill
          href="/team"
          label="All Companies"
          isActive={!filterSlug}
          brandColor={null}
        />
        {orgs.map((o) => (
          <CompanyPill
            key={o.slug}
            href={`/team?co=${o.slug}`}
            label={o.name}
            isActive={filterSlug === o.slug}
            brandColor={o.brandColor}
          />
        ))}
      </div>

      {/* Body */}
      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[var(--rlg)] border border-border bg-card px-6 py-20 shadow-[var(--sh-xs)]">
          <div
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-[var(--r)]"
            style={{ backgroundColor: "var(--muted-bg-2)" }}
          >
            <Square className="h-6 w-6 text-text-2" />
          </div>
          <h2 className="mb-1 text-[15px] font-semibold text-text">
            No events scheduled
          </h2>
          <p className="mb-5 text-[12.5px] text-text-2">
            Schedule your first event.
          </p>
          <NewTeamEventButton
            orgs={orgs.map((o) => ({
              slug: o.slug,
              name: o.name,
              brandColor: o.brandColor,
            }))}
            defaultOrgSlug={active?.slug ?? orgs[0]?.slug ?? ""}
          />
        </div>
      ) : isCalendarView ? (
        <div className="rounded-[var(--rlg)] border border-border bg-card p-10 text-center shadow-[var(--sh-xs)]">
          <CalendarIcon className="mx-auto mb-3 h-8 w-8 text-text-3" />
          <p className="text-[13px] text-text-2">
            Calendar grid view coming next session. For now, use List or Cards.
          </p>
        </div>
      ) : isListView ? (
        <TeamEventsTable events={events} orgs={orgs} />
      ) : (
        <TeamEventsCardGrid events={events} orgs={orgs} />
      )}
    </div>
  );
}

// ─── Pieces ───────────────────────────────────────────────────
function CompanyPill({
  href,
  label,
  isActive,
  brandColor,
}: {
  href: string;
  label: string;
  isActive: boolean;
  brandColor: string | null;
}) {
  const dot = brandColor ? (
    <span
      className="h-1.5 w-1.5 shrink-0 rounded-full"
      style={{ backgroundColor: brandColor }}
    />
  ) : null;
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
        isActive
          ? "bg-pb-navy text-white"
          : "bg-muted-bg text-text-2 hover:bg-muted-bg-2 hover:text-text"
      }`}
      style={isActive && brandColor ? { backgroundColor: brandColor } : undefined}
    >
      {dot}
      {label}
    </Link>
  );
}

type TeamEvent = {
  id: string;
  title: string;
  date: Date;
  endDate: Date | null;
  location: string | null;
  type: string | null;
  notes: string | null;
  clientName: string | null;
  agentEmail: string | null;
  orgId: string;
  contactId: string | null;
  contactFirstName: string | null;
  contactLastName: string | null;
};

type OrgLite = {
  id: string;
  slug: string;
  name: string;
  brandColor: string;
};

function TeamEventsCardGrid({
  events,
  orgs,
}: {
  events: TeamEvent[];
  orgs: OrgLite[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((e) => {
        const org = orgs.find((o) => o.id === e.orgId);
        const displayClient =
          e.clientName ||
          [e.contactFirstName, e.contactLastName].filter(Boolean).join(" ") ||
          null;
        return (
          <div
            key={e.id}
            className="group relative flex flex-col overflow-hidden rounded-[var(--rlg)] border border-border bg-card shadow-[var(--sh-xs)]"
          >
            <div
              className="h-1 w-full"
              style={{ backgroundColor: org?.brandColor ?? "#021D40" }}
            />
            <div className="flex flex-1 flex-col p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span
                  className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white"
                  style={{ backgroundColor: org?.brandColor ?? "#021D40" }}
                >
                  {org?.slug === "realtyline" ? "RL" : org?.slug === "newsline" ? "NL" : "—"}
                </span>
                <form action={deleteTeamEvent}>
                  <input type="hidden" name="id" value={e.id} />
                  <button
                    type="submit"
                    aria-label="Delete event"
                    className="rounded-full p-1 text-text-3 opacity-0 transition-opacity hover:bg-[rgba(219,25,36,0.08)] hover:text-pb-red group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </form>
              </div>
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-2">
                <CalendarDays className="h-3 w-3" />
                {formatDateRange(e.date, e.endDate)}
              </div>
              <h3 className="mb-1 line-clamp-2 text-[14px] font-semibold text-text">
                {e.title}
              </h3>
              {displayClient && (
                <p className="mb-1 text-[12px] text-text-2">with {displayClient}</p>
              )}
              {e.location && (
                <div className="mb-1 flex items-center gap-1 text-[12px] text-text-2">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{e.location}</span>
                </div>
              )}
              {e.agentEmail && (
                <div className="text-[11px] text-text-2">{e.agentEmail}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TeamEventsTable({
  events,
  orgs,
}: {
  events: TeamEvent[];
  orgs: OrgLite[];
}) {
  return (
    <div className="overflow-hidden rounded-[var(--rlg)] border border-border bg-card shadow-[var(--sh-xs)]">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border bg-muted-bg text-[10px] uppercase tracking-wider text-text-2">
            <th className="px-4 py-3 text-left font-semibold">Title</th>
            <th className="px-4 py-3 text-left font-semibold">Client</th>
            <th className="px-4 py-3 text-left font-semibold">When</th>
            <th className="px-4 py-3 text-left font-semibold">Location</th>
            <th className="px-4 py-3 text-left font-semibold">Agent</th>
            <th className="px-4 py-3 text-left font-semibold">Co</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {events.map((e) => {
            const org = orgs.find((o) => o.id === e.orgId);
            const displayClient =
              e.clientName ||
              [e.contactFirstName, e.contactLastName].filter(Boolean).join(" ") ||
              "—";
            return (
              <tr key={e.id} className="hover:bg-muted-bg">
                <td className="px-4 py-3 font-medium text-text">{e.title}</td>
                <td className="px-4 py-3 text-text-2">{displayClient}</td>
                <td className="px-4 py-3 text-text-2">
                  {formatDateRange(e.date, e.endDate)}
                </td>
                <td className="px-4 py-3 text-text-2">{e.location ?? "—"}</td>
                <td className="px-4 py-3 text-text-2">{e.agentEmail ?? "—"}</td>
                <td className="px-4 py-3">
                  {org && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white"
                      style={{ backgroundColor: org.brandColor }}
                    >
                      {org.slug === "realtyline"
                        ? "RL"
                        : org.slug === "newsline"
                          ? "NL"
                          : "—"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <form action={deleteTeamEvent}>
                    <input type="hidden" name="id" value={e.id} />
                    <button
                      type="submit"
                      aria-label="Delete event"
                      className="rounded-full p-1 text-text-2 hover:bg-[rgba(219,25,36,0.08)] hover:text-pb-red"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
