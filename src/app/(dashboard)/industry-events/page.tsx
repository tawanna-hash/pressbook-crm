import { and, asc, desc, eq } from "drizzle-orm";
import Link from "next/link";
import {
  CalendarDays,
  Download,
  LayoutGrid,
  List,
  MapPin,
  Calendar as CalendarIcon,
  ExternalLink,
} from "lucide-react";
import { db } from "@/lib/db";
import {
  industryEvents,
  industryEventCategories,
  industryEventOrganizers,
  industryEventLocations,
} from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";
import { NewEventButton } from "./new-event-button";
import { ManageSettingsButton } from "./manage-settings";
import { ImportIndustryEventsButton } from "./import-button";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ view?: string }>;

function formatDateRange(
  start: Date | null,
  end: Date | null,
  allDay: boolean,
): string {
  if (!start) return "No date set";
  const sameDay =
    !end ||
    (start.toDateString() === end.toDateString());
  const dateOpts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };
  if (allDay) {
    if (sameDay) return start.toLocaleDateString(undefined, dateOpts);
    return `${start.toLocaleDateString(undefined, dateOpts)} – ${end!.toLocaleDateString(undefined, dateOpts)}`;
  }
  const startStr = `${start.toLocaleDateString(undefined, dateOpts)}, ${start.toLocaleTimeString(undefined, timeOpts)}`;
  if (sameDay && end) {
    return `${startStr} – ${end.toLocaleTimeString(undefined, timeOpts)}`;
  }
  if (end) {
    return `${startStr} → ${end.toLocaleDateString(undefined, dateOpts)}, ${end.toLocaleTimeString(undefined, timeOpts)}`;
  }
  return startStr;
}

function formatPrice(cents: number | null): string | null {
  if (cents == null) return null;
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function IndustryEventsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { view } = await searchParams;
  const isListView = view === "list";
  const isCalendarView = view === "calendar";
  const activeOrg = await getActiveOrg();

  if (!activeOrg) {
    return (
      <div className="rounded-[var(--rlg)] border border-border bg-card p-12 text-center">
        <p className="text-[13px] text-text-2">
          Pick a company in the sidebar to see its events.
        </p>
      </div>
    );
  }

  const [events, categoryRows, organizerRows, locationRows] = await Promise.all([
    db
      .select()
      .from(industryEvents)
      .where(eq(industryEvents.orgId, activeOrg.id))
      .orderBy(desc(industryEvents.startAt), desc(industryEvents.createdAt))
      .limit(200),
    db
      .select()
      .from(industryEventCategories)
      .where(eq(industryEventCategories.orgId, activeOrg.id))
      .orderBy(asc(industryEventCategories.name)),
    db
      .select()
      .from(industryEventOrganizers)
      .where(eq(industryEventOrganizers.orgId, activeOrg.id))
      .orderBy(asc(industryEventOrganizers.name)),
    db
      .select()
      .from(industryEventLocations)
      .where(eq(industryEventLocations.orgId, activeOrg.id))
      .orderBy(asc(industryEventLocations.venueName)),
  ]);

  const childCategories = categoryRows.filter((c) => !c.isParent);
  const formOptions = {
    categories: childCategories.map((c) => ({ id: c.id, name: c.name })),
    organizers: organizerRows.map((o) => ({ id: o.id, name: o.name })),
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">
            Industry Events
          </h1>
          <p className="mt-0.5 text-[13px] text-text-2">
            {events.length} {events.length === 1 ? "event" : "events"} scheduled
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* View toggle */}
          <div className="inline-flex items-center overflow-hidden rounded-[var(--r)] border border-border bg-card shadow-[var(--sh-xs)]">
            <Link
              href="/industry-events?view=calendar"
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
              href="/industry-events?view=list"
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
              href="/industry-events"
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

          <button
            type="button"
            disabled
            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-[var(--r)] border border-border bg-card px-3.5 py-2 text-[13px] font-medium text-text-3 shadow-[var(--sh-xs)]"
            title="Coming soon"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <ManageSettingsButton
            categories={categoryRows.map((c) => ({
              id: c.id,
              name: c.name,
              parentId: c.parentId,
              isParent: c.isParent,
            }))}
            organizers={organizerRows.map((o) => ({ id: o.id, name: o.name }))}
            locations={locationRows.map((l) => ({
              id: l.id,
              venueName: l.venueName,
              address: l.address,
              city: l.city,
              state: l.state,
              zip: l.zip,
            }))}
          />
        </div>
      </div>

      {/* Body */}
      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[var(--rlg)] border border-border bg-card px-6 py-20 shadow-[var(--sh-xs)]">
          <div
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-[var(--r)]"
            style={{ backgroundColor: "var(--muted-bg-2)" }}
          >
            <CalendarDays className="h-6 w-6 text-text-2" />
          </div>
          <h2 className="mb-1 text-[15px] font-semibold text-text">
            No events scheduled
          </h2>
          <p className="mb-5 text-[12.5px] text-text-2">
            Create your first event or import from a CSV or ICS file.
          </p>
          <div className="flex items-center gap-3">
            <ImportIndustryEventsButton />
            <NewEventButton options={formOptions} variant="big" />
          </div>
        </div>
      ) : isCalendarView ? (
        <div className="rounded-[var(--rlg)] border border-border bg-card p-10 text-center shadow-[var(--sh-xs)]">
          <CalendarIcon className="mx-auto mb-3 h-8 w-8 text-text-3" />
          <p className="text-[13px] text-text-2">
            Calendar grid view coming next session. For now, use List or Cards.
          </p>
        </div>
      ) : isListView ? (
        <EventsTable events={events} />
      ) : (
        <EventsCardGrid events={events} />
      )}
    </div>
  );
}

// ─── Card grid ────────────────────────────────────────────────
function EventsCardGrid({ events }: { events: typeof industryEvents.$inferSelect[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((e) => {
        const memberPrice = formatPrice(e.memberPriceCents);
        const nonMemberPrice = formatPrice(e.nonMemberPriceCents);
        return (
          <Link
            key={e.id}
            href={`/industry-events/${e.id}`}
            className="group relative flex flex-col overflow-hidden rounded-[var(--rlg)] border border-border bg-card shadow-[var(--sh-xs)] transition-all hover:shadow-[var(--sh-sm)]"
          >
            <div
              className="h-1.5 w-full"
              style={{ backgroundColor: e.eventColor ?? "#3D0740" }}
            />
            <div className="flex flex-1 flex-col p-4">
              <div className="mb-2 flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-text-2" />
                <span className="text-[11px] font-semibold uppercase tracking-wide text-text-2">
                  {formatDateRange(e.startAt, e.endAt, e.allDay)}
                </span>
              </div>
              <h3 className="mb-1 line-clamp-2 text-[14px] font-semibold text-text">
                {e.title}
              </h3>
              {e.organizer && (
                <p className="mb-2 text-[12px] text-text-2">{e.organizer}</p>
              )}
              {e.venueName && (
                <div className="mb-2 flex items-center gap-1.5 text-[12px] text-text-2">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {e.venueName}
                    {e.city && `, ${e.city}`}
                  </span>
                </div>
              )}
              {(memberPrice || nonMemberPrice) && (
                <p className="mb-2 text-[12px] text-text">
                  {memberPrice && <span className="font-semibold">{memberPrice}</span>}
                  {memberPrice && nonMemberPrice && (
                    <span className="text-text-2"> member / </span>
                  )}
                  {nonMemberPrice && <span className="font-semibold">{nonMemberPrice}</span>}
                  {nonMemberPrice && " non-member"}
                </p>
              )}
              {e.category && (
                <span
                  className="mt-auto inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{
                    backgroundColor: (e.eventColor ?? "#3D0740") + "18",
                    color: e.eventColor ?? "#3D0740",
                  }}
                >
                  {e.category}
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Table view ────────────────────────────────────────────────
function EventsTable({ events }: { events: typeof industryEvents.$inferSelect[] }) {
  return (
    <div className="overflow-hidden rounded-[var(--rlg)] border border-border bg-card shadow-[var(--sh-xs)]">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border bg-muted-bg text-[10px] uppercase tracking-wider text-text-2">
            <th className="px-4 py-3 text-left font-semibold">Title</th>
            <th className="px-4 py-3 text-left font-semibold">When</th>
            <th className="px-4 py-3 text-left font-semibold">Location</th>
            <th className="px-4 py-3 text-left font-semibold">Category</th>
            <th className="px-4 py-3 text-left font-semibold">Organizer</th>
            <th className="px-4 py-3 text-right font-semibold">Price</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {events.map((e) => (
            <tr key={e.id} className="hover:bg-muted-bg">
              <td className="px-4 py-3">
                <Link
                  href={`/industry-events/${e.id}`}
                  className="flex items-center gap-2 text-text hover:underline"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: e.eventColor ?? "#3D0740" }}
                  />
                  <span className="font-medium">{e.title}</span>
                </Link>
              </td>
              <td className="px-4 py-3 text-text-2">
                {formatDateRange(e.startAt, e.endAt, e.allDay)}
              </td>
              <td className="px-4 py-3 text-text-2">
                {[e.venueName, e.city].filter(Boolean).join(", ") || "—"}
              </td>
              <td className="px-4 py-3 text-text-2">{e.category ?? "—"}</td>
              <td className="px-4 py-3 text-text-2">{e.organizer ?? "—"}</td>
              <td className="px-4 py-3 text-right text-text">
                {formatPrice(e.memberPriceCents) ?? "—"}
              </td>
              <td className="px-4 py-3">
                {e.websiteUrl && (
                  <a
                    href={e.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Open registration URL"
                    className="text-text-2 hover:text-pb-navy"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
