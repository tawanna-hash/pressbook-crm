import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import {
  CalendarDays,
  Clock,
  Lock,
  MapPin,
  Phone,
  Users,
  Video,
} from "lucide-react";
import { db } from "@/lib/db";
import {
  meetingPolls,
  meetingPollTimes,
  meetingPollVotes,
  organizations,
  users,
} from "@/lib/db/schema";
import { VoteForm } from "./vote-form";

export const dynamic = "force-dynamic";

function formatLocation(loc: string): { label: string; icon: React.ReactNode } {
  switch (loc) {
    case "zoom":
      return { label: "Zoom", icon: <Video className="h-3.5 w-3.5" /> };
    case "phone":
      return { label: "Phone call", icon: <Phone className="h-3.5 w-3.5" /> };
    case "in_person":
      return { label: "In-person", icon: <MapPin className="h-3.5 w-3.5" /> };
    default:
      return {
        label: "Options on the call",
        icon: <Users className="h-3.5 w-3.5" />,
      };
  }
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function StaffPollPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [poll] = await db
    .select()
    .from(meetingPolls)
    .where(eq(meetingPolls.shareToken, token))
    .limit(1);
  if (!poll) notFound();

  const clerkUser = await currentUser();
  const [voter] = clerkUser
    ? await db
        .select()
        .from(users)
        .where(
          and(eq(users.clerkId, clerkUser.id), eq(users.orgId, poll.orgId)),
        )
        .limit(1)
    : [];

  const [[host], [org], times, votes] = await Promise.all([
    db.select().from(users).where(eq(users.id, poll.hostUserId)).limit(1),
    db
      .select()
      .from(organizations)
      .where(eq(organizations.id, poll.orgId))
      .limit(1),
    db
      .select()
      .from(meetingPollTimes)
      .where(eq(meetingPollTimes.pollId, poll.id))
      .orderBy(asc(meetingPollTimes.startAt)),
    db
      .select()
      .from(meetingPollVotes)
      .where(eq(meetingPollVotes.pollId, poll.id)),
  ]);

  const votesByTime = new Map<string, { name: string; email: string }[]>();
  for (const v of votes) {
    const arr = votesByTime.get(v.timeId) ?? [];
    arr.push({ name: v.voterName, email: v.voterEmail });
    votesByTime.set(v.timeId, arr);
  }

  const locationMeta = formatLocation(poll.location);
  const isClosed = poll.status !== "open";
  const hasAlreadyVoted = voter
    ? votes.some((v) => v.voterEmail === voter.email.toLowerCase())
    : false;
  const uniqueVoters = new Set(votes.map((v) => v.voterEmail)).size;

  return (
    <div className="relative min-h-screen overflow-hidden bg-muted-bg/40">
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute inset-x-0 -top-24 h-64 opacity-60 blur-3xl"
        style={{
          background: `radial-gradient(ellipse at center, ${org?.brandColor ?? "#021D40"}22 0%, transparent 70%)`,
        }}
      />

      <div className="relative mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
        {/* Org chip */}
        {org && (
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[12px] font-medium text-text-2 shadow-[var(--sh-xs)]">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: org.brandColor }}
            />
            {org.name}
          </div>
        )}

        {/* Hero card — invitation */}
        <div className="mb-5 overflow-hidden rounded-[var(--rlg)] border border-border bg-card shadow-[var(--sh-sm)]">
          {/* Header strip with host */}
          <div className="flex items-center gap-3 border-b border-border bg-muted-bg/40 px-6 py-4">
            {host?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={host.avatarUrl}
                alt=""
                className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-card"
              />
            ) : (
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white ring-2 ring-card"
                style={{ backgroundColor: org?.brandColor ?? "#021D40" }}
              >
                {host ? initialsOf(host.name) : "?"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[10.5px] font-semibold uppercase tracking-wider text-text-2">
                Meeting invitation
              </div>
              <div className="truncate text-[13px] font-medium text-text">
                <span className="font-semibold">{host?.name ?? "Your host"}</span>{" "}
                invites the team
              </div>
            </div>
          </div>

          {/* Title + meta */}
          <div className="px-6 py-6">
            <h1 className="mb-4 text-[22px] font-bold leading-tight text-text sm:text-[26px]">
              {poll.name}
            </h1>
            <div className="flex flex-wrap gap-2">
              <MetaChip
                icon={<Clock className="h-3.5 w-3.5" />}
                label={`${poll.durationMinutes} minutes`}
              />
              <MetaChip icon={locationMeta.icon} label={locationMeta.label} />
              <MetaChip
                icon={<CalendarDays className="h-3.5 w-3.5" />}
                label={`${times.length} time${times.length === 1 ? "" : "s"} proposed`}
              />
              {uniqueVoters > 0 && (
                <MetaChip
                  icon={<Users className="h-3.5 w-3.5" />}
                  label={`${uniqueVoters} voted`}
                  tone="accent"
                />
              )}
            </div>
            {poll.description && (
              <div className="mt-4 rounded-[var(--r)] border border-border bg-muted-bg/40 px-4 py-3 text-[13px] leading-relaxed text-text-2">
                {poll.description}
              </div>
            )}
          </div>
        </div>

        {!clerkUser ? (
          <LockedCard
            title="Sign in to Vote"
            body="This poll is for staff only. Sign in to cast your votes."
            cta={{ href: "/sign-in", label: "Sign in" }}
          />
        ) : !voter ? (
          <LockedCard
            title="Different Organization"
            body={`This poll belongs to ${org?.name ?? "another organization"}. Switch to that org to vote.`}
          />
        ) : isClosed ? (
          <div className="flex items-center justify-center rounded-[var(--rlg)] border border-border bg-card px-6 py-10 text-center text-[13px] text-text-2 shadow-[var(--sh-xs)]">
            This poll is no longer accepting votes.
          </div>
        ) : (
          <VoteForm
            token={token}
            times={times.map((t) => ({
              id: t.id,
              startAt: t.startAt.toISOString(),
              endAt: t.endAt.toISOString(),
            }))}
            votesByTime={Object.fromEntries(votesByTime.entries())}
            showVoters={poll.showVotes}
            voter={{ name: voter.name, email: voter.email }}
            hasAlreadyVoted={hasAlreadyVoted}
          />
        )}

        <div className="mt-8 flex items-center justify-center gap-1.5 text-[11px] text-text-3">
          <span className="inline-block h-1 w-1 rounded-full bg-text-3" />
          Powered by PressBook CRM
          <span className="inline-block h-1 w-1 rounded-full bg-text-3" />
        </div>
      </div>
    </div>
  );
}

function MetaChip({
  icon,
  label,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  tone?: "default" | "accent";
}) {
  const cls =
    tone === "accent"
      ? "bg-pb-navy/10 text-pb-navy ring-1 ring-pb-navy/20"
      : "bg-muted-bg text-text-2 ring-1 ring-border";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ${cls}`}
    >
      {icon}
      {label}
    </span>
  );
}

function LockedCard({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--rlg)] border border-border bg-card px-6 py-10 text-center shadow-[var(--sh-xs)]">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted-bg-2 text-text-2">
        <Lock className="h-5 w-5" />
      </div>
      <h2 className="mb-1 text-[14.5px] font-semibold text-text">{title}</h2>
      <p className="mb-4 max-w-sm text-[12.5px] text-text-2">{body}</p>
      {cta && (
        <Link
          href={cta.href}
          className="inline-flex items-center gap-1.5 rounded-[var(--r)] bg-pb-navy px-4 py-2 text-[13px] font-semibold text-white shadow-[var(--sh-xs)] hover:opacity-90"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
