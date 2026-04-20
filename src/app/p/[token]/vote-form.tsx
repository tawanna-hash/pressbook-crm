"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Sparkles, Users2 } from "lucide-react";
import { submitVote } from "../../(dashboard)/booking/scheduling/actions";

type TimeRow = { id: string; startAt: string; endAt: string };
type Voter = { name: string; email: string };

function groupByDate(times: TimeRow[]): { date: string; rows: TimeRow[] }[] {
  const map = new Map<string, TimeRow[]>();
  for (const t of times) {
    const d = new Date(t.startAt);
    const key = d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    const arr = map.get(key) ?? [];
    arr.push(t);
    map.set(key, arr);
  }
  return Array.from(map.entries()).map(([date, rows]) => ({ date, rows }));
}

function formatTime(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(" ", "")
    .toLowerCase();
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function VoteForm({
  token,
  times,
  votesByTime,
  showVoters,
  voter,
  hasAlreadyVoted,
}: {
  token: string;
  times: TimeRow[];
  votesByTime: Record<string, Voter[]>;
  showVoters: boolean;
  voter: Voter;
  hasAlreadyVoted: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const grouped = useMemo(() => groupByDate(times), [times]);
  const maxVotes = useMemo(() => {
    let m = 0;
    for (const arr of Object.values(votesByTime)) if (arr.length > m) m = arr.length;
    return m;
  }, [votesByTime]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set("token", token);
    for (const id of selected) fd.append("timeIds", id);
    startTransition(async () => {
      const res = await submitVote(fd);
      if (res.ok) setSubmitted(true);
      else setError(res.error);
    });
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[var(--rlg)] border border-border bg-card px-6 py-10 text-center shadow-[var(--sh-xs)]">
        <div className="relative mb-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(34,139,99,0.12)] text-[rgb(34,139,99)]">
            <Check className="h-6 w-6" />
          </div>
          <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-[rgb(34,139,99)]" />
        </div>
        <h2 className="mb-1 text-[16px] font-semibold text-text">
          Thanks for voting!
        </h2>
        <p className="max-w-sm text-[12.5px] text-text-2">
          The host will confirm the final time shortly. Feel free to close
          this tab.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-[var(--rlg)] border border-border bg-card shadow-[var(--sh-xs)]"
    >
      {/* Voting-as chip */}
      <div className="flex items-center gap-2.5 border-b border-border bg-muted-bg/40 px-5 py-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pb-navy text-[10px] font-bold text-white">
          {initialsOf(voter.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10.5px] font-semibold uppercase tracking-wider text-text-2">
            Voting as
          </div>
          <div className="truncate text-[12.5px] font-medium text-text">
            {voter.name}{" "}
            <span className="text-text-3">· {voter.email}</span>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <h2 className="mb-1 text-[16px] font-semibold text-text">
          {hasAlreadyVoted
            ? "Update your picks"
            : "Pick the times that work for you"}
        </h2>
        <p className="mb-5 text-[12.5px] leading-relaxed text-text-2">
          Tap any time card to add or remove your vote.
          {hasAlreadyVoted &&
            " Your earlier votes stay unless you re-vote the same times."}
        </p>

        <div className="space-y-5">
          {grouped.map((g) => (
            <div key={g.date}>
              <div className="mb-2 flex items-center gap-2">
                <div className="text-[12px] font-semibold text-text">
                  {g.date}
                </div>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {g.rows.map((t) => {
                  const voters = votesByTime[t.id] ?? [];
                  const isSelected = selected.has(t.id);
                  const isTop = maxVotes > 0 && voters.length === maxVotes;
                  return (
                    <TimeOption
                      key={t.id}
                      time={t}
                      voters={voters}
                      selected={isSelected}
                      onToggle={() => toggle(t.id)}
                      showVoters={showVoters}
                      isTop={isTop}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-[var(--r)] border border-pb-red/30 bg-[rgba(219,25,36,0.06)] px-3 py-2 text-[12.5px] text-pb-red">
            {error}
          </div>
        )}
      </div>

      {/* Sticky submit footer */}
      <div className="flex items-center justify-between gap-3 border-t border-border bg-muted-bg/30 px-5 py-3.5 sm:px-6">
        <div className="text-[12.5px] text-text-2">
          <span className="font-semibold text-text tabular-nums">
            {selected.size}
          </span>{" "}
          selected
        </div>
        <button
          type="submit"
          disabled={isPending || selected.size === 0}
          className="inline-flex items-center gap-1.5 rounded-[var(--r)] bg-pb-navy px-5 py-2 text-[13px] font-semibold text-white shadow-[var(--sh-xs)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Submitting…" : `Submit Vote${selected.size === 1 ? "" : "s"}`}
        </button>
      </div>
    </form>
  );
}

function TimeOption({
  time,
  voters,
  selected,
  onToggle,
  showVoters,
  isTop,
}: {
  time: TimeRow;
  voters: Voter[];
  selected: boolean;
  onToggle: () => void;
  showVoters: boolean;
  isTop: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`group/opt relative flex items-center gap-3 rounded-[var(--r)] border px-3.5 py-3 text-left transition-all ${
        selected
          ? "border-pb-navy bg-pb-navy/5 ring-2 ring-[rgba(2,29,64,0.12)]"
          : "border-border bg-card hover:border-pb-navy/40 hover:bg-muted-bg/60"
      }`}
    >
      {/* Selection indicator */}
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
          selected
            ? "border-pb-navy bg-pb-navy text-white"
            : "border-border bg-card group-hover/opt:border-pb-navy/50"
        }`}
      >
        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="text-[14px] font-semibold text-text tabular-nums">
            {formatTime(time.startAt)} – {formatTime(time.endAt)}
          </div>
          {isTop && voters.length > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-[rgba(34,139,99,0.12)] px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-[rgb(22,101,72)]">
              <Sparkles className="h-2.5 w-2.5" />
              Top
            </span>
          )}
        </div>
        {showVoters && voters.length > 0 ? (
          <div className="mt-1.5 flex items-center gap-1.5">
            <AvatarStack voters={voters} />
            <span className="text-[11px] text-text-2">
              {voters.length} {voters.length === 1 ? "vote" : "votes"}
            </span>
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-1 text-[11px] text-text-3">
            <Users2 className="h-3 w-3" />
            {voters.length === 0
              ? "No votes yet"
              : `${voters.length} ${voters.length === 1 ? "vote" : "votes"}`}
          </div>
        )}
      </div>
    </button>
  );
}

function AvatarStack({ voters }: { voters: Voter[] }) {
  const shown = voters.slice(0, 4);
  const overflow = voters.length - shown.length;
  return (
    <div className="flex -space-x-1.5">
      {shown.map((v, i) => (
        <div
          key={i}
          title={`${v.name} (${v.email})`}
          className="flex h-5 w-5 items-center justify-center rounded-full bg-pb-navy text-[9px] font-bold text-white ring-2 ring-card"
        >
          {initialsOf(v.name)}
        </div>
      ))}
      {overflow > 0 && (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted-bg-2 text-[9px] font-bold text-text-2 ring-2 ring-card">
          +{overflow}
        </div>
      )}
    </div>
  );
}
