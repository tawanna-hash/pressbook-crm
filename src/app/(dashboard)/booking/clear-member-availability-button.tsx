"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import {
  clearAvailabilityForUser,
  deleteTeamMember,
} from "./actions";

/**
 * Small text button shown on a team member's booking card. Wipes every
 * `availability_slots` row for that member (scoped to the active org).
 * Non-destructive for the member themselves — they stay in the team.
 */
export function ClearMemberAvailabilityButton({
  memberId,
  memberName,
}: {
  memberId: string;
  memberName: string;
}) {
  const [pending, start] = useTransition();

  function handleClick() {
    const ok = window.confirm(
      `Clear all availability for ${memberName}? This can't be undone.`,
    );
    if (!ok) return;
    const fd = new FormData();
    fd.set("userId", memberId);
    start(async () => {
      const res = await clearAvailabilityForUser(fd);
      if (!res.ok) {
        alert(`Couldn't clear availability: ${res.error}`);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label={`Clear availability for ${memberName}`}
      title="Clear availability"
      className="inline-flex items-center rounded-[var(--r)] border border-border bg-card px-2.5 py-1 text-[11.5px] font-medium text-text-2 transition-colors hover:bg-muted-bg hover:text-text disabled:cursor-wait disabled:opacity-50"
    >
      {pending ? "Clearing…" : "Clear"}
    </button>
  );
}

/**
 * Trash icon shown in the corner of a team member card. Removes the
 * member from the org entirely (and their availability slots). Server
 * refuses if the target is the currently-signed-in user.
 */
export function DeleteMemberButton({
  memberId,
  memberName,
}: {
  memberId: string;
  memberName: string;
}) {
  const [pending, start] = useTransition();

  function handleClick() {
    const ok = window.confirm(
      `Remove ${memberName} from this org? This deletes their availability and booking card. Existing bookings stay on the calendar. This can't be undone.`,
    );
    if (!ok) return;
    const fd = new FormData();
    fd.set("memberId", memberId);
    start(async () => {
      const res = await deleteTeamMember(fd);
      if (!res.ok) {
        alert(`Couldn't remove member: ${res.error}`);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label={`Remove ${memberName} from org`}
      title="Remove member"
      className="rounded-full p-1.5 text-text-3 transition-colors hover:bg-[rgba(219,25,36,0.08)] hover:text-pb-red disabled:cursor-wait disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );
}
