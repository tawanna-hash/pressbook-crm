"use server";

import { randomBytes } from "crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  meetingPolls,
  meetingPollTimes,
  meetingPollVotes,
  users,
} from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";

const ALLOWED_LOCATIONS = new Set([
  "zoom",
  "phone",
  "in_person",
  "all_options",
] as const);
type PollLocation = typeof ALLOWED_LOCATIONS extends Set<infer T> ? T : never;

function generateToken(): string {
  // url-safe, 22 chars (base64url of 16 random bytes, no padding)
  return randomBytes(16).toString("base64url");
}

/**
 * Create a new meeting poll.
 *
 * Expected FormData:
 *   name                string (defaults to "Meeting")
 *   durationMinutes     number
 *   location            "zoom" | "phone" | "in_person" | "all_options"
 *   description         string (optional)
 *   reserveTimes        "on" | null
 *   showVotes           "on" | null
 *   language            string (defaults to "en")
 *   times               JSON string of {startAt: iso, endAt: iso}[]
 *
 * Returns the new poll's id and shareToken on success so the caller can
 * render the share-success screen.
 */
export async function createPoll(
  formData: FormData,
): Promise<{ ok: true; id: string; shareToken: string } | { ok: false; error: string }> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "No active org" };

  const clerkUser = await currentUser();
  if (!clerkUser) return { ok: false, error: "Not signed in" };

  // Resolve host user row
  const [host] = await db
    .select()
    .from(users)
    .where(and(eq(users.clerkId, clerkUser.id), eq(users.orgId, org.id)))
    .limit(1);
  if (!host) return { ok: false, error: "Host user row not found for this org" };

  // Parse form
  const name = String(formData.get("name") ?? "").trim() || "Meeting";
  const durationRaw = Number(formData.get("durationMinutes") ?? 30);
  const durationMinutes =
    Number.isFinite(durationRaw) && durationRaw > 0 ? Math.floor(durationRaw) : 30;
  const locationRaw = String(formData.get("location") ?? "zoom");
  const location: PollLocation = ALLOWED_LOCATIONS.has(locationRaw as PollLocation)
    ? (locationRaw as PollLocation)
    : "zoom";
  const description = String(formData.get("description") ?? "").trim() || null;
  const reserveTimes = formData.get("reserveTimes") === "on";
  const showVotes = formData.get("showVotes") !== "off"; // default on
  const language = String(formData.get("language") ?? "en").trim() || "en";

  const timesJson = String(formData.get("times") ?? "[]");
  let times: { startAt: string; endAt: string }[] = [];
  try {
    const parsed = JSON.parse(timesJson);
    if (Array.isArray(parsed)) {
      times = parsed.filter(
        (t) =>
          typeof t === "object" &&
          t !== null &&
          typeof t.startAt === "string" &&
          typeof t.endAt === "string",
      );
    }
  } catch {
    /* ignore */
  }
  if (times.length === 0) {
    return { ok: false, error: "Pick at least one time." };
  }

  const shareToken = generateToken();

  // Insert poll + times
  const [poll] = await db
    .insert(meetingPolls)
    .values({
      orgId: org.id,
      hostUserId: host.id,
      shareToken,
      name,
      durationMinutes,
      location,
      description,
      reserveTimes,
      showVotes,
      language,
      status: "open",
    })
    .returning();

  await db.insert(meetingPollTimes).values(
    times.map((t) => ({
      pollId: poll.id,
      startAt: new Date(t.startAt),
      endAt: new Date(t.endAt),
    })),
  );

  revalidatePath("/booking/scheduling");
  return { ok: true, id: poll.id, shareToken };
}

/**
 * Vote submission. Staff-only — voter identity is derived from the signed-in
 * Clerk user. Caller only passes the poll token and chosen time IDs.
 * Voter must belong to the same org as the poll.
 */
export async function submitVote(formData: FormData): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const clerkUser = await currentUser();
  if (!clerkUser) return { ok: false, error: "You must be signed in to vote." };

  const token = String(formData.get("token") ?? "").trim();
  const timeIdsRaw = formData.getAll("timeIds");
  const timeIds = timeIdsRaw.map(String).filter(Boolean);
  if (!token) return { ok: false, error: "Missing poll token." };
  if (timeIds.length === 0)
    return { ok: false, error: "Pick at least one time." };

  const [poll] = await db
    .select()
    .from(meetingPolls)
    .where(eq(meetingPolls.shareToken, token))
    .limit(1);
  if (!poll) return { ok: false, error: "Poll not found." };
  if (poll.status !== "open")
    return { ok: false, error: "This poll is closed." };

  // Resolve voter's users row and verify same-org
  const [voter] = await db
    .select()
    .from(users)
    .where(and(eq(users.clerkId, clerkUser.id), eq(users.orgId, poll.orgId)))
    .limit(1);
  if (!voter)
    return { ok: false, error: "Only staff in this org can vote on this poll." };

  const voterName = voter.name;
  const voterEmail = voter.email.toLowerCase();

  // Only accept vote rows whose time_id actually belongs to this poll
  const pollTimes = await db
    .select()
    .from(meetingPollTimes)
    .where(eq(meetingPollTimes.pollId, poll.id));
  const validIds = new Set(pollTimes.map((t) => t.id));
  const validSelections = timeIds.filter((id) => validIds.has(id));
  if (validSelections.length === 0)
    return { ok: false, error: "Selected times don't belong to this poll." };

  // Insert, ignoring duplicates (unique index on (time_id, lower(voter_email)))
  for (const timeId of validSelections) {
    try {
      await db.insert(meetingPollVotes).values({
        pollId: poll.id,
        timeId,
        voterName,
        voterEmail,
      });
    } catch {
      /* duplicate vote — ignore */
    }
  }

  // Refresh the vote page (so the vote list updates live) AND the host's
  // scheduling list (so the "N votes" count on the poll card re-fetches).
  revalidatePath(`/p/${token}`);
  revalidatePath("/booking/scheduling");
  return { ok: true };
}

/**
 * Delete a poll (and its times/votes via ON DELETE CASCADE).
 * Only callable from within the poll's org — we verify the active org owns it.
 */
export async function deletePoll(formData: FormData): Promise<void> {
  const org = await getActiveOrg();
  if (!org) return;
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  await db
    .delete(meetingPolls)
    .where(and(eq(meetingPolls.id, id), eq(meetingPolls.orgId, org.id)));

  revalidatePath("/booking/scheduling");
}
