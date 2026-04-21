import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Home,
  Inbox,
  UserMinus,
  Users,
} from "lucide-react";
import { and, count, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";
import { buttonClasses } from "@/components/ui/button";

export const dynamic = "force-dynamic";

async function countSegment(orgId: string, segment: string): Promise<number> {
  const row = await db
    .select({ c: count() })
    .from(contacts)
    .where(and(
      eq(contacts.orgId, orgId),
      eq(contacts.type, "mailing"),
      sql`${contacts.tags} @> ${JSON.stringify([segment])}::jsonb`,
    ));
  return row[0]?.c ?? 0;
}

export default async function MailingHubPage() {
  const activeOrg = await getActiveOrg();

  const counts = activeOrg
    ? {
        total: (
          await db
            .select({ c: count() })
            .from(contacts)
            .where(and(
              eq(contacts.orgId, activeOrg.id),
              eq(contacts.type, "mailing"),
            ))
        )[0]?.c ?? 0,
        advertiser:     await countSegment(activeOrg.id, "advertiser"),
        nonAdvertiser:  await countSegment(activeOrg.id, "non-advertiser"),
        realtor:        await countSegment(activeOrg.id, "realtor"),
      }
    : { total: 0, advertiser: 0, nonAdvertiser: 0, realtor: 0 };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Mailing List Hub</h1>
          <p className="mt-0.5 text-[13px] text-text-2">
            Audiences you send to — each segment supports import and export in CSV,
            TSV, Excel, or JSON.
          </p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Total Subscribers" value={counts.total}         sub="all segments"    icon={<Users className="h-4 w-4" />} />
        <KpiCard label="Advertisers"       value={counts.advertiser}    sub="paying clients"  icon={<Briefcase className="h-4 w-4" />}   tone="#10B981" />
        <KpiCard label="Non-Advertisers"   value={counts.nonAdvertiser} sub="prospects"       icon={<UserMinus className="h-4 w-4" />}   tone="#F59E0B" />
        <KpiCard label="REALTORS"          value={counts.realtor}       sub="licensed agents" icon={<Home className="h-4 w-4" />}        tone="#3D0740" />
      </div>

      {/* Segment tiles */}
      <div className="space-y-3">
        <div>
          <h2 className="text-[15px] font-semibold text-text">Segments</h2>
          <p className="text-[12.5px] text-text-2">
            Open a list to import, export, sort, or manage contacts for that segment.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <HubTile
            href="/mailing/advertisers"
            icon={<Briefcase className="h-5 w-5" />}
            title="Advertisers"
            caption="Businesses who currently or previously purchased ads with you."
            count={counts.advertiser}
            accent="#10B981"
          />
          <HubTile
            href="/mailing/non-advertisers"
            icon={<UserMinus className="h-5 w-5" />}
            title="Non-Advertisers"
            caption="Prospects and contacts who haven't run an ad yet."
            count={counts.nonAdvertiser}
            accent="#F59E0B"
          />
          <HubTile
            href="/mailing/realtors"
            icon={<Home className="h-5 w-5" />}
            title="REALTORS"
            caption="Licensed real estate agents — your core industry audience."
            count={counts.realtor}
            accent="#3D0740"
          />
        </div>
      </div>

      {/* Footer hint */}
      <div className="rounded-[var(--rlg)] border border-dashed border-border bg-card px-6 py-6 text-center shadow-[var(--sh-xs)]">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-[var(--r)] bg-pb-navy/10 text-pb-navy">
          <Inbox className="h-5 w-5" />
        </div>
        <h2 className="mb-1 text-[14px] font-semibold text-text">
          Import / export from every segment
        </h2>
        <p className="mx-auto max-w-xl text-[12.5px] leading-relaxed text-text-2">
          Each segment page supports <span className="font-semibold">Import</span>{" "}
          (CSV, TSV, XLSX, XLS, JSON) and <span className="font-semibold">Export</span>{" "}
          (CSV, TSV, XLSX, JSON) with auto-matched column headers and sortable columns.
        </p>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────

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
