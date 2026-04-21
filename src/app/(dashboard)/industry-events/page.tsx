import Link from "next/link";
import {
  ArrowRight,
  Calendar as CalendarIcon,
  CalendarDays,
  Clock,
  History,
  LayoutGrid,
  MapPin,
  Tags,
  Users,
} from "lucide-react";
import { and, count, eq, gt, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  industryEvents,
  industryEventCategories,
  industryEventOrganizers,
  industryEventLocations,
} from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";
import { buttonClasses } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function EventsCalendarHubPage() {
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

  const now = new Date();
  const base = eq(industryEvents.orgId, activeOrg.id);

  const [totalRow, upcomingRow, pastRow, categoryCountRow, organizerCountRow, locationCountRow] =
    await Promise.all([
      db.select({ c: count() }).from(industryEvents).where(base),
      db.select({ c: count() }).from(industryEvents)
        .where(and(base, gt(industryEvents.startAt, now))),
      db.select({ c: count() }).from(industryEvents)
        .where(and(base, lte(industryEvents.startAt, now))),
      db.select({ c: count() }).from(industryEventCategories)
        .where(eq(industryEventCategories.orgId, activeOrg.id)),
      db.select({ c: count() }).from(industryEventOrganizers)
        .where(eq(industryEventOrganizers.orgId, activeOrg.id)),
      db.select({ c: count() }).from(industryEventLocations)
        .where(eq(industryEventLocations.orgId, activeOrg.id)),
    ]);

  const counts = {
    total:      totalRow[0]?.c          ?? 0,
    upcoming:   upcomingRow[0]?.c       ?? 0,
    past:       pastRow[0]?.c           ?? 0,
    categories: categoryCountRow[0]?.c  ?? 0,
    organizers: organizerCountRow[0]?.c ?? 0,
    locations:  locationCountRow[0]?.c  ?? 0,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Events Calendar (website)</h1>
          <p className="mt-0.5 text-[13px] text-text-2">
            External events, CE courses, conferences, and expos surfaced on the public site.
          </p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Total Events" value={counts.total}      sub="all time"        icon={<CalendarDays className="h-4 w-4" />}                    />
        <KpiCard label="Upcoming"     value={counts.upcoming}   sub="future dates"    icon={<Clock className="h-4 w-4" />}         tone="#10B981"    />
        <KpiCard label="Past"         value={counts.past}       sub="already ran"     icon={<History className="h-4 w-4" />}       tone="#6B7280"    />
        <KpiCard label="Categories"   value={counts.categories} sub="tags + groups"   icon={<Tags className="h-4 w-4" />}          tone="#3D0740"    />
        <KpiCard label="Organizers"   value={counts.organizers} sub="orgs / partners" icon={<Users className="h-4 w-4" />}         tone="#F59E0B"    />
        <KpiCard label="Locations"    value={counts.locations}  sub="saved venues"    icon={<MapPin className="h-4 w-4" />}        tone="#0EA5E9"    />
      </div>

      {/* Section: Events */}
      <Section title="Events" description="Browse the full calendar or jump straight to a time range.">
        <HubTile
          href="/industry-events/list"
          icon={<LayoutGrid className="h-5 w-5" />}
          title="All Events"
          caption="Every event on the calendar, newest first."
          count={counts.total}
        />
        <HubTile
          href="/industry-events/list/upcoming"
          icon={<Clock className="h-5 w-5" />}
          title="Upcoming"
          caption="Events happening from today forward."
          count={counts.upcoming}
          accent="#10B981"
        />
        <HubTile
          href="/industry-events/list/past"
          icon={<History className="h-5 w-5" />}
          title="Past"
          caption="Events that have already taken place."
          count={counts.past}
          accent="#6B7280"
        />
        <HubTile
          href="/calendar"
          icon={<CalendarIcon className="h-5 w-5" />}
          title="Full Calendar"
          caption="See events plotted on the monthly grid."
        />
      </Section>

      {/* Section: Setup */}
      <Section
        title="Setup"
        description="Manage the taxonomy that events use — open the list to edit these."
      >
        <HubTile
          href="/industry-events/list"
          icon={<Tags className="h-5 w-5" />}
          title="Categories"
          caption="Parent and child tags events can be grouped by."
          count={counts.categories}
          accent="#3D0740"
        />
        <HubTile
          href="/industry-events/list"
          icon={<Users className="h-5 w-5" />}
          title="Organizers"
          caption="The orgs, chapters, and partners running events."
          count={counts.organizers}
          accent="#F59E0B"
        />
        <HubTile
          href="/industry-events/list"
          icon={<MapPin className="h-5 w-5" />}
          title="Locations"
          caption="Saved venues you can pick from when creating an event."
          count={counts.locations}
          accent="#0EA5E9"
        />
      </Section>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-[15px] font-semibold text-text">{title}</h2>
        {description && (
          <p className="text-[12.5px] text-text-2">{description}</p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {children}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: number;
  sub: string;
  icon: React.ReactNode;
  tone?: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-[var(--rlg)] border border-border bg-card p-4 shadow-[var(--sh-xs)]">
      <div
        className="flex h-8 w-8 items-center justify-center rounded-[var(--r)]"
        style={{
          backgroundColor: tone ? `${tone}14` : "var(--muted-bg-2, rgba(50, 58, 70, .07))",
          color: tone ?? "var(--text-2)",
        }}
      >
        {icon}
      </div>
      <div className="text-2xl font-bold text-text">{value}</div>
      <div>
        <div className="text-[12px] font-semibold text-text">{label}</div>
        <div className="text-[11px] text-text-2">{sub}</div>
      </div>
    </div>
  );
}

function HubTile({
  href,
  icon,
  title,
  caption,
  count,
  accent,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  caption: string;
  count?: number;
  accent?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-2 rounded-[var(--rlg)] border border-border bg-card p-5 shadow-[var(--sh-xs)] transition-shadow hover:shadow-[var(--sh-sm)]"
    >
      <div className="flex items-start justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-[var(--r)]"
          style={{
            backgroundColor: accent ? `${accent}14` : "rgba(2, 29, 64, 0.08)",
            color: accent ?? "var(--pb-navy, #021D40)",
          }}
        >
          {icon}
        </div>
        {typeof count === "number" && (
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{
              backgroundColor: accent ? `${accent}14` : "rgba(2, 29, 64, 0.08)",
              color: accent ?? "var(--pb-navy, #021D40)",
            }}
          >
            {count}
          </span>
        )}
      </div>
      <div className="text-[14px] font-semibold text-text">{title}</div>
      <div className="text-[12px] text-text-2">{caption}</div>
      <span
        className={
          buttonClasses({ variant: "secondary", size: "sm", className: "mt-2 w-fit" })
        }
      >
        Open
        <ArrowRight className="h-3 w-3" />
      </span>
    </Link>
  );
}
