import { count, desc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import {
  CalendarClock,
  Clock,
  ExternalLink,
  Sparkles,
  Users2,
  Vote,
} from "lucide-react";
import { db } from "@/lib/db";
import { meetingPolls, meetingPollTimes, meetingPollVotes } from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";
import { buttonClasses } from "@/components/ui/button";
import { CreatePollButton } from "./create-poll-modal";
import { CopyLinkButton } from "./copy-link-button";
import { DeletePollButton } from "./delete-poll-button";
import { RefreshOnFocus } from "./refresh-on-focus";

export const dynamic = "force-dynamic";

function formatCount(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

export default async function SchedulingPage() {
  const org = await getActiveOrg();
  if (!org) {
    return (
      <div className="rounded-[var(--rlg)] border border-border bg-card p-12 text-center">
        <p className="text-[13px] text-text-2">Pick a company in the sidebar.</p>
      </div>
    );
  }

  // 1) Fetch polls for this org
  const pollRows = await db
    .select({
      id: meetingPolls.id,
      name: meetingPolls.name,
      shareToken: meetingPolls.shareToken,
      durationMinutes: meetingPolls.durationMinutes,
      status: meetingPolls.status,
      createdAt: meetingPolls.createdAt,
    })
    .from(meetingPolls)
    .where(eq(meetingPolls.orgId, org.id))
    .orderBy(desc(meetingPolls.createdAt));

  // 2) Fetch per-poll time + vote counts in parallel, then merge in JS.
  //    We used to do correlated subqueries via drizzle's sql template, but
  //    that fell through the cracks and always returned 0 — so cards showed
  //    "0 times / 0 votes" no matter what. Explicit GROUP BY is reliable.
  const pollIds = pollRows.map((p) => p.id);
  const [timeRows, voteRows] = pollIds.length
    ? await Promise.all([
        db
          .select({ pollId: meetingPollTimes.pollId, c: count() })
          .from(meetingPollTimes)
          .where(inArray(meetingPollTimes.pollId, pollIds))
          .groupBy(meetingPollTimes.pollId),
        db
          .select({ pollId: meetingPollVotes.pollId, c: count() })
          .from(meetingPollVotes)
          .where(inArray(meetingPollVotes.pollId, pollIds))
          .groupBy(meetingPollVotes.pollId),
      ])
    : [[], []];

  const timeByPoll = new Map(timeRows.map((r) => [r.pollId, r.c]));
  const voteByPoll = new Map(voteRows.map((r) => [r.pollId, r.c]));

  const polls = pollRows.map((p) => ({
    ...p,
    timeCount: timeByPoll.get(p.id) ?? 0,
    voteCount: voteByPoll.get(p.id) ?? 0,
  }));

  return (
    <div className="space-y-5">
      <RefreshOnFocus />
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text">Scheduling</h1>
          <p className="mt-0.5 text-[13px] text-text-2">
            Create meeting polls and let invitees vote on times.
          </p>
        </div>
      </div>

      {polls.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {polls.map((p) => (
            <PollCard key={p.id} poll={p} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Pieces ───────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--rlg)] border border-border bg-card px-6 py-16 text-center shadow-[var(--sh-xs)]">
      <div className="relative mb-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-[var(--rlg)] bg-pb-navy/10 text-pb-navy">
          <Vote className="h-7 w-7" />
        </div>
        <div className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-pb-navy text-white shadow-[var(--sh-xs)]">
          <Sparkles className="h-3 w-3" />
        </div>
      </div>
      <h2 className="mb-1 text-[15px] font-semibold text-text">
        No Meeting Polls Yet
      </h2>
      <p className="mb-5 max-w-sm text-[12.5px] leading-relaxed text-text-2">
        Propose several times, share one link, and let the team pick what
        works best for them.
      </p>
      <CreatePollButton />
    </div>
  );
}

function PollCard({
  poll,
}: {
  poll: {
    id: string;
    name: string;
    shareToken: string;
    durationMinutes: number;
    status: string;
    createdAt: Date;
    timeCount: number;
    voteCount: number;
  };
}) {
  const statusConfig =
    poll.status === "open"
      ? {
          label: "Open",
          className:
            "bg-[rgba(34,139,99,0.12)] text-[rgb(22,101,72)] ring-1 ring-[rgba(34,139,99,0.25)]",
          dot: "bg-[rgb(34,139,99)]",
        }
      : poll.status === "booked"
        ? {
            label: "Booked",
            className: "bg-pb-navy/10 text-pb-navy ring-1 ring-pb-navy/20",
            dot: "bg-pb-navy",
          }
        : {
            label: poll.status,
            className:
              "bg-muted-bg-2 text-text-2 ring-1 ring-border",
            dot: "bg-text-3",
          };

  // Votes-per-proposed-time — a rough "engagement" bar.
  const maxBar = Math.max(poll.timeCount, 1) * 2; // 2 votes/time is "full"
  const pct = Math.min(100, Math.round((poll.voteCount / maxBar) * 100));

  return (
    <div className="group flex flex-col rounded-[var(--rlg)] border border-border bg-card p-5 shadow-[var(--sh-xs)] transition-shadow hover:shadow-[var(--sh-sm)]">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--r)] bg-pb-navy/10 text-pb-navy">
          <CalendarClock className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold text-text">
            {poll.name}
          </div>
          <div className="mt-0.5 text-[11.5px] text-text-2">
            Created {new Date(poll.createdAt).toLocaleDateString()}
          </div>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide ${statusConfig.className}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
          {statusConfig.label}
        </span>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2 text-center">
        <Metric
          icon={<Clock className="h-3.5 w-3.5" />}
          value={`${poll.durationMinutes}m`}
          label="duration"
        />
        <Metric
          icon={<Users2 className="h-3.5 w-3.5" />}
          value={String(poll.timeCount)}
          label={poll.timeCount === 1 ? "time" : "times"}
        />
        <Metric
          icon={<Vote className="h-3.5 w-3.5" />}
          value={String(poll.voteCount)}
          label={poll.voteCount === 1 ? "vote" : "votes"}
        />
      </div>

      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-wider text-text-2">
          <span>Engagement</span>
          <span>{formatCount(poll.voteCount, "vote")}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted-bg">
          <div
            className="h-full rounded-full bg-pb-navy transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mt-auto flex items-center gap-2">
        <Link
          href={`/p/${poll.shareToken}`}
          target="_blank"
          rel="noreferrer"
          className={buttonClasses({
            variant: "secondary",
            size: "sm",
            className: "flex-1",
          })}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View Poll
        </Link>
        <CopyLinkButton token={poll.shareToken} />
        <DeletePollButton pollId={poll.id} pollName={poll.name} />
      </div>
    </div>
  );
}

function Metric({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-[var(--r)] bg-muted-bg/40 px-2 py-2 ring-1 ring-border">
      <div className="flex items-center justify-center gap-1 text-text-2">
        {icon}
        <span className="text-[14px] font-bold tabular-nums text-text">
          {value}
        </span>
      </div>
      <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-text-3">
        {label}
      </div>
    </div>
  );
}
