import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleSlash,
  FileText,
  Sparkles,
  Users,
} from "lucide-react";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";
import { buttonClasses } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ClientHubPage() {
  const activeOrg = await getActiveOrg();

  const base = activeOrg
    ? and(eq(contacts.orgId, activeOrg.id), eq(contacts.type, "client"))
    : eq(contacts.type, "client");

  const [totalRow, activeRow, prospectRow, inactiveRow] = await Promise.all([
    db.select({ c: count() }).from(contacts).where(base),
    db.select({ c: count() }).from(contacts)
      .where(and(base, eq(contacts.status, "active"))),
    db.select({ c: count() }).from(contacts)
      .where(and(base, eq(contacts.status, "prospect"))),
    db.select({ c: count() }).from(contacts)
      .where(and(base, eq(contacts.status, "inactive"))),
  ]);

  const counts = {
    total:    totalRow[0]?.c    ?? 0,
    active:   activeRow[0]?.c   ?? 0,
    prospect: prospectRow[0]?.c ?? 0,
    inactive: inactiveRow[0]?.c ?? 0,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Client Hub</h1>
          <p className="mt-0.5 text-[13px] text-text-2">
            Everything related to your clients — the list, their agreements, and booking.
          </p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Total Clients" value={counts.total}    sub="all statuses"      icon={<Users className="h-4 w-4" />}        />
        <KpiCard label="Active"        value={counts.active}   sub="currently working" icon={<CheckCircle2 className="h-4 w-4" />} tone="#10B981" />
        <KpiCard label="Prospects"     value={counts.prospect} sub="nurturing"         icon={<Sparkles className="h-4 w-4" />}     tone="#F59E0B" />
        <KpiCard label="Inactive"      value={counts.inactive} sub="archived"          icon={<CircleSlash className="h-4 w-4" />}  tone="#6B7280" />
      </div>

      {/* Section: Clients */}
      <Section title="Clients" description="Your people — filter by lifecycle stage.">
        <HubTile
          href="/clients/all"
          icon={<Users className="h-5 w-5" />}
          title="All Clients"
          caption="Browse every client for this company."
          count={counts.total}
        />
        <HubTile
          href="/clients/active"
          icon={<CheckCircle2 className="h-5 w-5" />}
          title="Active"
          caption="Clients you're currently working with."
          count={counts.active}
          accent="#10B981"
        />
        <HubTile
          href="/clients/prospects"
          icon={<Sparkles className="h-5 w-5" />}
          title="Prospects"
          caption="Leads and potential clients you're nurturing."
          count={counts.prospect}
          accent="#F59E0B"
        />
        <HubTile
          href="/clients/inactive"
          icon={<CircleSlash className="h-5 w-5" />}
          title="Inactive"
          caption="Archived clients you no longer actively work with."
          count={counts.inactive}
          accent="#6B7280"
        />
      </Section>

      {/* Section: Client Workflows */}
      <Section
        title="Client Workflows"
        description="Tools tied directly to the clients in this hub."
      >
        <HubTile
          href="/agreements"
          icon={<FileText className="h-5 w-5" />}
          title="Agreements"
          caption="Insertion orders, print contracts, e-signable email agreements."
        />
        <HubTile
          href="/calendarly"
          icon={<CalendarClock className="h-5 w-5" />}
          title="PressBook Us"
          caption="Scheduling, meeting polls, team calendar, and booking."
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
