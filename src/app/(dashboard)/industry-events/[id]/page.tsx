import { and, asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  MapPin,
  Tag,
  Trash2,
  Users,
} from "lucide-react";
import { db } from "@/lib/db";
import {
  industryEvents,
  industryEventCategories,
  industryEventOrganizers,
} from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";
import { deleteIndustryEvent } from "../actions";
import { EditEventButton } from "./edit-event-button";

export const dynamic = "force-dynamic";

function formatDateRange(
  start: Date | null,
  end: Date | null,
  allDay: boolean,
): string {
  if (!start) return "No date set";
  const dateOpts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };
  const sameDay =
    !end || start.toDateString() === end.toDateString();
  if (allDay) {
    return sameDay
      ? start.toLocaleDateString(undefined, dateOpts)
      : `${start.toLocaleDateString(undefined, dateOpts)} – ${end!.toLocaleDateString(undefined, dateOpts)}`;
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

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const activeOrg = await getActiveOrg();

  const [event] = await db
    .select()
    .from(industryEvents)
    .where(eq(industryEvents.id, id))
    .limit(1);

  if (!event) notFound();

  // If the event belongs to a different active org, bounce to the list.
  if (activeOrg && event.orgId !== activeOrg.id) {
    redirect("/industry-events");
  }

  const [categoryRows, organizerRows] = await Promise.all([
    activeOrg
      ? db
          .select()
          .from(industryEventCategories)
          .where(
            and(
              eq(industryEventCategories.orgId, activeOrg.id),
              eq(industryEventCategories.isParent, false),
            ),
          )
          .orderBy(asc(industryEventCategories.name))
      : Promise.resolve([]),
    activeOrg
      ? db
          .select()
          .from(industryEventOrganizers)
          .where(eq(industryEventOrganizers.orgId, activeOrg.id))
          .orderBy(asc(industryEventOrganizers.name))
      : Promise.resolve([]),
  ]);

  const formOptions = {
    categories: categoryRows.map((c) => ({ id: c.id, name: c.name })),
    organizers: organizerRows.map((o) => ({ id: o.id, name: o.name })),
  };

  const memberPrice =
    event.memberPriceCents != null ? `$${(event.memberPriceCents / 100).toFixed(2)}` : null;
  const nonMemberPrice =
    event.nonMemberPriceCents != null ? `$${(event.nonMemberPriceCents / 100).toFixed(2)}` : null;

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/industry-events"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-text-2 transition-colors hover:text-text"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to events
      </Link>

      <div className="overflow-hidden rounded-[var(--rlg)] border border-border bg-card shadow-[var(--sh-xs)]">
        <div
          className="h-2 w-full"
          style={{ backgroundColor: event.eventColor ?? "#3D0740" }}
        />
        <div className="px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-text">{event.title}</h1>
              {event.organizer && (
                <p className="mt-0.5 text-[13px] text-text-2">
                  Organized by {event.organizer}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <EditEventButton
                initial={{
                  id: event.id,
                  title: event.title,
                  description: event.description,
                  allDay: event.allDay,
                  startAt: event.startAt,
                  endAt: event.endAt,
                  venueName: event.venueName,
                  address: event.address,
                  address2: event.address2,
                  city: event.city,
                  state: event.state,
                  zip: event.zip,
                  websiteUrl: event.websiteUrl,
                  memberPriceCents: event.memberPriceCents,
                  nonMemberPriceCents: event.nonMemberPriceCents,
                  courseNumber: event.courseNumber,
                  trecLicenseNumber: event.trecLicenseNumber,
                  category: event.category,
                  organizer: event.organizer,
                  tags: event.tags,
                  pushToTeamCalendar: event.pushToTeamCalendar,
                  eventColor: event.eventColor,
                }}
                options={formOptions}
              />
            </div>
          </div>

          {event.description && (
            <p className="mt-4 whitespace-pre-wrap text-[13px] text-text-2">
              {event.description}
            </p>
          )}

          <div className="mt-5 grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
            <Fact icon={CalendarDays} label="When">
              {formatDateRange(event.startAt, event.endAt, event.allDay)}
            </Fact>
            <Fact icon={MapPin} label="Where">
              {event.venueName ? (
                <>
                  <div className="font-medium text-text">{event.venueName}</div>
                  {(event.address || event.city) && (
                    <div className="text-[12.5px] text-text-2">
                      {[event.address, event.city, event.state, event.zip]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  )}
                </>
              ) : (
                <span className="text-text-2">—</span>
              )}
            </Fact>
            <Fact icon={Users} label="Pricing">
              {memberPrice || nonMemberPrice ? (
                <>
                  {memberPrice && (
                    <div>
                      <span className="font-medium text-text">{memberPrice}</span>{" "}
                      <span className="text-text-2">member</span>
                    </div>
                  )}
                  {nonMemberPrice && (
                    <div>
                      <span className="font-medium text-text">{nonMemberPrice}</span>{" "}
                      <span className="text-text-2">non-member</span>
                    </div>
                  )}
                </>
              ) : (
                <span className="text-text-2">Free / not specified</span>
              )}
            </Fact>
            <Fact icon={Tag} label="Classification">
              <div className="space-y-1 text-[12.5px]">
                {event.category && (
                  <div>
                    <span className="text-text-2">Category: </span>
                    <span className="text-text">{event.category}</span>
                  </div>
                )}
                {event.courseNumber && (
                  <div>
                    <span className="text-text-2">Course #: </span>
                    <span className="text-text">{event.courseNumber}</span>
                  </div>
                )}
                {event.trecLicenseNumber && (
                  <div>
                    <span className="text-text-2">TREC #: </span>
                    <span className="text-text">{event.trecLicenseNumber}</span>
                  </div>
                )}
                {!event.category &&
                  !event.courseNumber &&
                  !event.trecLicenseNumber && (
                    <span className="text-text-2">—</span>
                  )}
              </div>
            </Fact>
          </div>

          {event.websiteUrl && (
            <div className="mt-5 border-t border-border pt-4">
              <a
                href={event.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-pb-navy hover:opacity-70"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {event.websiteUrl}
              </a>
            </div>
          )}

          {event.tags && event.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {event.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-muted-bg-2 px-2 py-0.5 text-[11px] font-medium text-text-2"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-[var(--rlg)] border border-[rgba(219,25,36,0.25)] bg-[rgba(219,25,36,0.04)] p-5">
        <h3 className="text-[14px] font-semibold text-text">Danger zone</h3>
        <p className="mt-1 text-[12.5px] text-text-2">
          Deleting this event removes it from the CRM. If it was pushed to the
          Team Calendar, that copy is removed too.
        </p>
        <form action={deleteIndustryEvent} className="mt-3">
          <input type="hidden" name="id" value={event.id} />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-[var(--r)] border border-[rgba(219,25,36,0.4)] bg-card px-3.5 py-2 text-[12.5px] font-semibold text-pb-red transition-colors hover:bg-[rgba(219,25,36,0.08)]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete event
          </button>
        </form>
      </div>
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof CalendarDays;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r)]"
        style={{ backgroundColor: "var(--muted-bg-2)" }}
      >
        <Icon className="h-3.5 w-3.5 text-text-2" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-text-2">
          {label}
        </div>
        <div className="text-[13px] text-text">{children}</div>
      </div>
    </div>
  );
}
