import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  ShieldCheck,
  Users,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { db } from "@/lib/db";
import { contacts, portalMagicLinks } from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";
import { Button, buttonClasses } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  active:   { label: "Active",   color: "#10B981" },
  prospect: { label: "Prospect", color: "#F59E0B" },
  inactive: { label: "Inactive", color: "#6B7280" },
};

function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function timeAgo(date: Date): string {
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.round(months / 12);
  return `${years}y ago`;
}

export default async function DashboardPage() {
  const [user, activeOrg] = await Promise.all([currentUser(), getActiveOrg()]);
  const firstName = user?.firstName ?? "there";
  const greeting = greetingFor(new Date());

  // ── KPI counts ─────────────────────────────────────────────
  const baseScope = activeOrg
    ? and(eq(contacts.type, "client"), eq(contacts.orgId, activeOrg.id))
    : eq(contacts.type, "client");

  // Portal user count is now "distinct contacts who have consumed at
  // least one magic link" — clients don't have Clerk accounts anymore.
  const [counts] = await db
    .select({
      total:    sql<number>`count(*)::int`,
      active:   sql<number>`count(*) filter (where ${contacts.status} = 'active')::int`,
      prospect: sql<number>`count(*) filter (where ${contacts.status} = 'prospect')::int`,
      portal:   sql<number>`(
        SELECT COUNT(DISTINCT ${portalMagicLinks.contactId})::int
        FROM ${portalMagicLinks}
        WHERE ${portalMagicLinks.consumedAt} IS NOT NULL
        ${activeOrg ? sql`AND ${portalMagicLinks.orgId} = ${activeOrg.id}` : sql``}
      )`,
    })
    .from(contacts)
    .where(baseScope);

  // ── Recently added (last 5) ────────────────────────────────
  const recent = await db
    .select({
      id:         contacts.id,
      avatarUrl:  contacts.avatarUrl,
      firstName:  contacts.firstName,
      lastName:   contacts.lastName,
      company:    contacts.company,
      email:      contacts.email,
      status:     contacts.status,
      clerkId:    contacts.clerkId,
      createdAt:  contacts.createdAt,
    })
    .from(contacts)
    .where(baseScope)
    .orderBy(desc(contacts.createdAt))
    .limit(5);

  // ── Recently opened portals (last 5 magic-link consumptions) ─
  // Joined against contacts so we display the client's name/avatar,
  // keyed by when they actually clicked the link (not when the row was
  // created). Multiple clicks per contact will collapse because we
  // limit to 5 most recent rows overall; an additional DISTINCT ON is
  // overkill for a dashboard widget.
  const recentlyActivatedRaw = await db
    .select({
      id:          contacts.id,
      avatarUrl:   contacts.avatarUrl,
      firstName:   contacts.firstName,
      lastName:    contacts.lastName,
      consumedAt:  portalMagicLinks.consumedAt,
    })
    .from(portalMagicLinks)
    .innerJoin(contacts, eq(contacts.id, portalMagicLinks.contactId))
    .where(
      activeOrg
        ? and(
            eq(portalMagicLinks.orgId, activeOrg.id),
            eq(contacts.type, "client"),
            isNotNull(portalMagicLinks.consumedAt),
          )
        : and(eq(contacts.type, "client"), isNotNull(portalMagicLinks.consumedAt)),
    )
    .orderBy(desc(portalMagicLinks.consumedAt))
    .limit(20);

  // Dedupe — keep the most recent consumption per contact, then take 5.
  const seen = new Set<string>();
  const recentlyActivated = recentlyActivatedRaw
    .filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    })
    .slice(0, 5);

  const KPI_CARDS = [
    {
      label: "Total Clients",
      value: counts?.total ?? 0,
      icon: Users,
      color: "#021D40",
      href: "/clients",
    },
    {
      label: "Active",
      value: counts?.active ?? 0,
      icon: UserCheck,
      color: "#10B981",
      href: "/clients?status=active",
    },
    {
      label: "Prospects",
      value: counts?.prospect ?? 0,
      icon: UserPlus,
      color: "#F59E0B",
      href: "/clients?status=prospect",
    },
    {
      label: "Portal Users",
      value: counts?.portal ?? 0,
      icon: ShieldCheck,
      color: "#3D0740",
      href: "/clients",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-extrabold text-foreground">
          {greeting}, {firstName}!
        </h1>
        <p className="mt-1 text-sm text-muted">
          {activeOrg
            ? `Here's what's happening at ${activeOrg.name} today.`
            : "Here's what's happening today."}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-pb-navy/40 hover:shadow-md"
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-lg"
                style={{ backgroundColor: card.color + "12" }}
              >
                <Icon className="h-5 w-5" style={{ color: card.color }} />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-foreground">
                  {card.value}
                </div>
                <div className="text-xs text-muted">{card.label}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          );
        })}
      </div>

      {/* Two-column section: Recent clients + Recently activated portals */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Clients */}
        <div className="rounded-xl border border-border bg-card shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-base font-semibold text-foreground">
              Recently Added Clients
            </h2>
            <Link
              href="/clients"
              className="inline-flex items-center gap-1 text-xs font-medium text-pb-navy hover:opacity-70"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <div
                className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: "rgba(2, 29, 64, 0.08)" }}
              >
                <Users className="h-5 w-5 text-pb-navy" />
              </div>
              <p className="mb-3 text-sm text-muted">
                No clients yet at {activeOrg?.name ?? "this company"}.
              </p>
              <Link
                href="/clients"
                className={buttonClasses({ variant: "primary", size: "sm" })}
              >
                <Plus className="h-3.5 w-3.5" />
                Add your first client
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((c) => {
                const name =
                  [c.firstName, c.lastName].filter(Boolean).join(" ") ||
                  "(no name)";
                const initials = (
                  (c.firstName?.[0] ?? "") + (c.lastName?.[0] ?? "")
                ).toUpperCase();
                const activated = Boolean(c.clerkId);
                const statusMeta =
                  STATUS_BADGE[c.status ?? "prospect"] ??
                  STATUS_BADGE.prospect;
                return (
                  <li key={c.id}>
                    <Link
                      href={`/clients/${c.id}`}
                      className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-[#FAFBFC]"
                    >
                      {c.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.avatarUrl}
                          alt=""
                          className="h-9 w-9 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-pb-navy"
                          style={{ backgroundColor: "rgba(2, 29, 64, 0.08)" }}
                        >
                          {initials || "—"}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">
                          {name}
                        </div>
                        <div className="truncate text-xs text-muted">
                          {c.company ?? c.email ?? "—"}
                        </div>
                      </div>
                      <span
                        className="hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium sm:inline-flex"
                        style={{
                          backgroundColor: statusMeta.color + "14",
                          color: statusMeta.color,
                        }}
                      >
                        {statusMeta.label}
                      </span>
                      {activated ? (
                        <span title="Portal active">
                          <CheckCircle2 className="h-4 w-4 text-pb-green" />
                        </span>
                      ) : (
                        <span title="Portal pending">
                          <Circle className="h-4 w-4 text-muted" />
                        </span>
                      )}
                      <span className="hidden text-xs text-muted sm:inline">
                        {timeAgo(c.createdAt)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Recently Activated Portals */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b border-border px-6 py-4">
            <ShieldCheck className="h-4 w-4 text-pb-green" />
            <h2 className="text-base font-semibold text-foreground">
              Recent Portal Opens
            </h2>
          </div>

          {recentlyActivated.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted">
              <Clock className="mx-auto mb-3 h-8 w-8 opacity-40" />
              No clients have signed in to the portal yet.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recentlyActivated.map((c) => {
                const name =
                  [c.firstName, c.lastName].filter(Boolean).join(" ") ||
                  "(no name)";
                const initials = (
                  (c.firstName?.[0] ?? "") + (c.lastName?.[0] ?? "")
                ).toUpperCase();
                return (
                  <li key={c.id}>
                    <Link
                      href={`/clients/${c.id}`}
                      className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-[#FAFBFC]"
                    >
                      {c.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.avatarUrl}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-pb-navy"
                          style={{ backgroundColor: "rgba(2, 29, 64, 0.08)" }}
                        >
                          {initials || "—"}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">
                          {name}
                        </div>
                        {c.consumedAt && (
                          <div className="text-xs text-muted">
                            {timeAgo(c.consumedAt)}
                          </div>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
