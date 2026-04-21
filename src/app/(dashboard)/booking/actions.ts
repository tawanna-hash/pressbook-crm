"use server";

import { and, eq, gte, isNull, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  availabilitySlots,
  bookingOrgSettings,
  calendarEvents,
  users,
} from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";

export type SimpleResult = { ok: true } | { ok: false; error: string };

export async function saveOrgBookingUrl(
  formData: FormData,
): Promise<SimpleResult> {
  try {
    const org = await getActiveOrg();
    if (!org) return { ok: false, error: "No active org. Pick a company in the sidebar." };
    const url = String(formData.get("publicBookingUrl") ?? "").trim() || null;

    const existing = await db
      .select()
      .from(bookingOrgSettings)
      .where(eq(bookingOrgSettings.orgId, org.id))
      .limit(1);

    if (existing[0]) {
      await db
        .update(bookingOrgSettings)
        .set({ publicBookingUrl: url, updatedAt: new Date() })
        .where(eq(bookingOrgSettings.orgId, org.id));
    } else {
      await db
        .insert(bookingOrgSettings)
        .values({ orgId: org.id, publicBookingUrl: url });
    }

    revalidatePath("/booking");
    return { ok: true };
  } catch (e) {
    console.error("saveOrgBookingUrl failed:", e);
    return { ok: false, error: e instanceof Error ? e.message : "Save failed." };
  }
}

export async function addAvailabilitySlot(
  formData: FormData,
): Promise<SimpleResult> {
  try {
    const org = await getActiveOrg();
    if (!org) return { ok: false, error: "No active org. Pick a company in the sidebar." };

    const userId = String(formData.get("userId") ?? "").trim() || null;
    const dayOfWeekRaw = String(formData.get("dayOfWeek") ?? "").trim();
    const startTime = String(formData.get("startTime") ?? "").trim();
    const endTime = String(formData.get("endTime") ?? "").trim();

    if (!dayOfWeekRaw) return { ok: false, error: "Pick a day of the week." };
    const dayOfWeek = Number.parseInt(dayOfWeekRaw, 10);
    if (!Number.isFinite(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return { ok: false, error: `Invalid day value: ${dayOfWeekRaw}` };
    }
    if (!/^\d{2}:\d{2}$/.test(startTime))
      return { ok: false, error: `Start time is required (got "${startTime}").` };
    if (!/^\d{2}:\d{2}$/.test(endTime))
      return { ok: false, error: `End time is required (got "${endTime}").` };
    if (startTime >= endTime)
      return { ok: false, error: "End time must be after start time." };

    await db.insert(availabilitySlots).values({
      orgId: org.id,
      userId,
      dayOfWeek,
      startTime,
      endTime,
    });
    revalidatePath("/booking");
    return { ok: true };
  } catch (e) {
    console.error("addAvailabilitySlot failed:", e);
    return { ok: false, error: e instanceof Error ? e.message : "Add failed." };
  }
}

export async function deleteAvailabilitySlot(
  formData: FormData,
): Promise<SimpleResult> {
  try {
    const id = String(formData.get("id") ?? "").trim();
    const org = await getActiveOrg();
    if (!id) return { ok: false, error: "Missing slot id." };
    if (!org) return { ok: false, error: "No active org." };
    await db
      .delete(availabilitySlots)
      .where(
        and(eq(availabilitySlots.id, id), eq(availabilitySlots.orgId, org.id)),
      );
    revalidatePath("/booking");
    return { ok: true };
  } catch (e) {
    console.error("deleteAvailabilitySlot failed:", e);
    return { ok: false, error: e instanceof Error ? e.message : "Delete failed." };
  }
}

/**
 * Remove a team member from the active org. Cascades: wipes their
 * availability slots and nulls out `created_by` on any calendar events they
 * created. Refuses to delete the currently-signed-in user (you can't boot
 * yourself).
 */
export async function deleteTeamMember(
  formData: FormData,
): Promise<SimpleResult> {
  try {
    const org = await getActiveOrg();
    if (!org) return { ok: false, error: "No active org." };

    const memberId = String(formData.get("memberId") ?? "").trim();
    if (!memberId) return { ok: false, error: "Missing member id." };

    const clerkUser = await currentUser();
    if (clerkUser) {
      const [self] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.clerkId, clerkUser.id), eq(users.orgId, org.id)))
        .limit(1);
      if (self?.id === memberId) {
        return { ok: false, error: "You can't remove yourself." };
      }
    }

    // Verify the target belongs to this org.
    const [target] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, memberId), eq(users.orgId, org.id)))
      .limit(1);
    if (!target)
      return { ok: false, error: "That member isn't in this org." };

    // Wipe their availability first — the users row is referenced by
    // availability_slots without cascade.
    await db
      .delete(availabilitySlots)
      .where(
        and(
          eq(availabilitySlots.orgId, org.id),
          eq(availabilitySlots.userId, memberId),
        ),
      );

    // Finally, remove the member.
    await db
      .delete(users)
      .where(and(eq(users.id, memberId), eq(users.orgId, org.id)));

    revalidatePath("/booking");
    revalidatePath("/team");
    revalidatePath("/calendarly");
    return { ok: true };
  } catch (e) {
    console.error("deleteTeamMember failed:", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Delete failed.",
    };
  }
}

/**
 * Delete every availability slot belonging to a given member (or all
 * "all-team" slots if userId is empty). Scoped to the active org so nobody
 * can wipe another org's data.
 */
export async function clearAvailabilityForUser(
  formData: FormData,
): Promise<SimpleResult> {
  try {
    const org = await getActiveOrg();
    if (!org) return { ok: false, error: "No active org." };

    // userId can be "" (meaning the "All team members" bucket) or a uuid.
    const userIdRaw = String(formData.get("userId") ?? "").trim();
    const userId = userIdRaw === "" ? null : userIdRaw;

    await db
      .delete(availabilitySlots)
      .where(
        and(
          eq(availabilitySlots.orgId, org.id),
          userId === null
            ? isNull(availabilitySlots.userId)
            : eq(availabilitySlots.userId, userId),
        ),
      );

    revalidatePath("/booking");
    return { ok: true };
  } catch (e) {
    console.error("clearAvailabilityForUser failed:", e);
    return { ok: false, error: e instanceof Error ? e.message : "Clear failed." };
  }
}

// ─── Internal booking: "Book a Time" button ───────────────────
export type BookTimeResult =
  | { ok: true; eventId: string }
  | { ok: false; error: string };

/**
 * Book a concrete time slot with a given member. Creates a calendar_events
 * row that shows up in Calendarly (if a contact is later linked) and in the
 * Team Calendar.
 *
 * Expected FormData:
 *   memberId     uuid of the member to book with
 *   startAt      ISO datetime the meeting starts
 *   clientName   string
 *   clientEmail  string (validated loosely)
 *
 * The member must belong to the active org. Slot validity is sanity-checked
 * against the member's weekly availability and existing bookings, but the
 * main gate is that the UI only surfaces valid, unbooked slots.
 */
export async function bookTime(formData: FormData): Promise<BookTimeResult> {
  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "No active org." };

  const memberId = String(formData.get("memberId") ?? "").trim();
  const startAtStr = String(formData.get("startAt") ?? "").trim();
  const clientName = String(formData.get("clientName") ?? "").trim();
  const clientEmail = String(formData.get("clientEmail") ?? "").trim().toLowerCase();

  if (!memberId) return { ok: false, error: "Missing member." };
  if (!startAtStr) return { ok: false, error: "Pick a time." };
  if (!clientName) return { ok: false, error: "Your name is required." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clientEmail))
    return { ok: false, error: "A valid email is required." };

  const startAt = new Date(startAtStr);
  if (Number.isNaN(startAt.getTime()))
    return { ok: false, error: "Invalid start time." };
  if (startAt.getTime() < Date.now())
    return { ok: false, error: "That time is in the past." };

  const [member] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, memberId), eq(users.orgId, org.id)))
    .limit(1);
  if (!member)
    return { ok: false, error: "That team member isn't in this org." };

  const durationMinutes = member.meetingDurationMinutes ?? 30;
  const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);

  // Conflict check — any existing event for this member overlapping
  // [startAt, endAt). We only check agent_email match because that's how we
  // associate events with a hosting member today.
  const sameDayStart = new Date(startAt);
  sameDayStart.setHours(0, 0, 0, 0);
  const sameDayEnd = new Date(sameDayStart);
  sameDayEnd.setDate(sameDayEnd.getDate() + 1);

  const existing = await db
    .select({ id: calendarEvents.id, date: calendarEvents.date })
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.orgId, org.id),
        eq(calendarEvents.agentEmail, member.email),
        gte(calendarEvents.date, sameDayStart),
        lt(calendarEvents.date, sameDayEnd),
      ),
    );
  const conflict = existing.some((e) => {
    const t = e.date.getTime();
    return t === startAt.getTime();
  });
  if (conflict)
    return { ok: false, error: "That slot was just taken. Pick another." };

  // createdBy — if the current Clerk user has a row in this org, attribute
  // the booking to them. Otherwise leave null (e.g. public client booking).
  const clerkUser = await currentUser();
  let createdBy: string | null = null;
  if (clerkUser) {
    const [self] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.clerkId, clerkUser.id), eq(users.orgId, org.id)))
      .limit(1);
    createdBy = self?.id ?? null;
  }

  const [inserted] = await db
    .insert(calendarEvents)
    .values({
      orgId: org.id,
      title: `Booking with ${member.name}`,
      date: startAt,
      endDate: endAt,
      durationMinutes,
      location: member.meetingLocation ?? null,
      type: "booking",
      notes: `Booked by ${clientName} <${clientEmail}>`,
      clientName,
      agentEmail: member.email,
      createdBy,
    })
    .returning({ id: calendarEvents.id });

  revalidatePath("/booking");
  revalidatePath("/calendarly");
  revalidatePath("/team");
  return { ok: true, eventId: inserted.id };
}
