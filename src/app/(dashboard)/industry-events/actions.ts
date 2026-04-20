"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  calendarEvents,
  industryEvents,
  industryEventCategories,
  industryEventOrganizers,
  industryEventLocations,
} from "@/lib/db/schema";
import { getActiveOrg } from "@/lib/auth/active-org";

// ─── Event form types ─────────────────────────────────────────
export type EventFormState = {
  ok: boolean;
  message: string;
  fieldErrors?: Partial<
    Record<
      | "title"
      | "startDate"
      | "startTime"
      | "endDate"
      | "endTime"
      | "websiteUrl"
      | "memberPrice"
      | "nonMemberPrice"
      | "eventColor",
      string
    >
  >;
};

function priceToCents(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

function combineDateTime(date: string, time: string): Date | null {
  if (!date) return null;
  const when = time ? `${date}T${time}` : `${date}T00:00`;
  const parsed = new Date(when);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseTagsInput(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

// ─── Create / Update event ────────────────────────────────────
export async function saveIndustryEvent(
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const id = String(formData.get("id") ?? "").trim() || null;

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const allDay = formData.get("allDay") === "on";

  const startDate = String(formData.get("startDate") ?? "").trim();
  const startTime = String(formData.get("startTime") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();
  const endTime = String(formData.get("endTime") ?? "").trim();

  const venueName = String(formData.get("venueName") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const address2 = String(formData.get("address2") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const zip = String(formData.get("zip") ?? "").trim();

  const websiteUrl = String(formData.get("websiteUrl") ?? "").trim();
  const memberPriceRaw = String(formData.get("memberPrice") ?? "").trim();
  const nonMemberPriceRaw = String(formData.get("nonMemberPrice") ?? "").trim();
  const courseNumber = String(formData.get("courseNumber") ?? "").trim();
  const trecLicenseNumber = String(
    formData.get("trecLicenseNumber") ?? "",
  ).trim();

  const category = String(formData.get("category") ?? "").trim();
  const organizer = String(formData.get("organizer") ?? "").trim();
  const tagsRaw = String(formData.get("tags") ?? "");
  const pushToTeamCalendar = formData.get("pushToTeamCalendar") === "on";
  const eventColor = String(formData.get("eventColor") ?? "#3D0740").trim();

  // Validation
  const fieldErrors: NonNullable<EventFormState["fieldErrors"]> = {};
  if (!title) fieldErrors.title = "Title is required.";
  if (websiteUrl && !/^https?:\/\//i.test(websiteUrl)) {
    fieldErrors.websiteUrl = "URL must start with http:// or https://";
  }
  const memberPriceCents = memberPriceRaw ? priceToCents(memberPriceRaw) : null;
  if (memberPriceRaw && memberPriceCents === null) {
    fieldErrors.memberPrice = "Enter a valid amount.";
  }
  const nonMemberPriceCents = nonMemberPriceRaw
    ? priceToCents(nonMemberPriceRaw)
    : null;
  if (nonMemberPriceRaw && nonMemberPriceCents === null) {
    fieldErrors.nonMemberPrice = "Enter a valid amount.";
  }

  const startAt = combineDateTime(startDate, allDay ? "" : startTime);
  const endAt = endDate ? combineDateTime(endDate, allDay ? "" : endTime) : null;

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const org = await getActiveOrg();
  if (!org) {
    return { ok: false, message: "No active company selected." };
  }

  const baseValues = {
    orgId: org.id,
    title,
    description: description || null,
    allDay,
    startAt,
    endAt,
    venueName: venueName || null,
    address: address || null,
    address2: address2 || null,
    city: city || null,
    state: state || null,
    zip: zip || null,
    websiteUrl: websiteUrl || null,
    memberPriceCents,
    nonMemberPriceCents,
    courseNumber: courseNumber || null,
    trecLicenseNumber: trecLicenseNumber || null,
    category: category || null,
    organizer: organizer || null,
    tags: parseTagsInput(tagsRaw),
    pushToTeamCalendar,
    eventColor: eventColor || "#3D0740",
    updatedAt: new Date(),
  };

  try {
    if (id) {
      // Update
      await db
        .update(industryEvents)
        .set(baseValues)
        .where(and(eq(industryEvents.id, id), eq(industryEvents.orgId, org.id)));
      // If push-to-calendar got toggled, mirror the event to calendar_events.
      await syncTeamCalendarLink(id, baseValues.pushToTeamCalendar, {
        title,
        startAt,
        endAt,
        location: venueName || address || null,
        orgId: org.id,
      });
    } else {
      const [created] = await db
        .insert(industryEvents)
        .values(baseValues)
        .returning({ id: industryEvents.id });
      if (created && pushToTeamCalendar) {
        await syncTeamCalendarLink(created.id, true, {
          title,
          startAt,
          endAt,
          location: venueName || address || null,
          orgId: org.id,
        });
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, message: `Couldn't save event: ${message}` };
  }

  revalidatePath("/industry-events");
  if (id) revalidatePath(`/industry-events/${id}`);
  return { ok: true, message: id ? "Event updated." : "Event created." };
}

/**
 * If the user wants the event mirrored onto the Team Calendar, create a
 * linked calendar_events row (or update it). If they turned the flag OFF,
 * delete the linked row.
 */
async function syncTeamCalendarLink(
  industryEventId: string,
  enabled: boolean,
  payload: {
    title: string;
    startAt: Date | null;
    endAt: Date | null;
    location: string | null;
    orgId: string;
  },
): Promise<void> {
  const [event] = await db
    .select({
      linkedId: industryEvents.linkedCalendarEventId,
    })
    .from(industryEvents)
    .where(eq(industryEvents.id, industryEventId))
    .limit(1);

  if (enabled && payload.startAt) {
    if (event?.linkedId) {
      await db
        .update(calendarEvents)
        .set({
          title: payload.title,
          date: payload.startAt,
          endDate: payload.endAt,
          location: payload.location,
          type: "Industry Event",
        })
        .where(eq(calendarEvents.id, event.linkedId));
    } else {
      const [created] = await db
        .insert(calendarEvents)
        .values({
          orgId: payload.orgId,
          title: payload.title,
          date: payload.startAt,
          endDate: payload.endAt,
          location: payload.location,
          type: "Industry Event",
        })
        .returning({ id: calendarEvents.id });
      if (created) {
        await db
          .update(industryEvents)
          .set({ linkedCalendarEventId: created.id })
          .where(eq(industryEvents.id, industryEventId));
      }
    }
  } else if (!enabled && event?.linkedId) {
    await db.delete(calendarEvents).where(eq(calendarEvents.id, event.linkedId));
    await db
      .update(industryEvents)
      .set({ linkedCalendarEventId: null })
      .where(eq(industryEvents.id, industryEventId));
  }
}

// ─── Delete event ─────────────────────────────────────────────
export async function deleteIndustryEvent(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const org = await getActiveOrg();
  if (!org) return;

  // Clean up any linked team-calendar row first.
  const [row] = await db
    .select({ linkedId: industryEvents.linkedCalendarEventId })
    .from(industryEvents)
    .where(and(eq(industryEvents.id, id), eq(industryEvents.orgId, org.id)))
    .limit(1);
  if (row?.linkedId) {
    await db.delete(calendarEvents).where(eq(calendarEvents.id, row.linkedId));
  }
  await db
    .delete(industryEvents)
    .where(and(eq(industryEvents.id, id), eq(industryEvents.orgId, org.id)));

  revalidatePath("/industry-events");
  redirect("/industry-events");
}

// ─── Settings CRUD (categories / organizers / locations) ─────
export async function addCategory(formData: FormData): Promise<void> {
  const org = await getActiveOrg();
  if (!org) return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const parentId = String(formData.get("parentId") ?? "").trim() || null;
  const isParent = formData.get("isParent") === "on";
  await db.insert(industryEventCategories).values({
    orgId: org.id,
    name,
    parentId,
    isParent,
  });
  revalidatePath("/industry-events");
}

export async function deleteCategory(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  const org = await getActiveOrg();
  if (!id || !org) return;
  await db
    .delete(industryEventCategories)
    .where(
      and(
        eq(industryEventCategories.id, id),
        eq(industryEventCategories.orgId, org.id),
      ),
    );
  revalidatePath("/industry-events");
}

export async function addOrganizer(formData: FormData): Promise<void> {
  const org = await getActiveOrg();
  if (!org) return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await db.insert(industryEventOrganizers).values({ orgId: org.id, name });
  revalidatePath("/industry-events");
}

export async function deleteOrganizer(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  const org = await getActiveOrg();
  if (!id || !org) return;
  await db
    .delete(industryEventOrganizers)
    .where(
      and(
        eq(industryEventOrganizers.id, id),
        eq(industryEventOrganizers.orgId, org.id),
      ),
    );
  revalidatePath("/industry-events");
}

export async function addLocation(formData: FormData): Promise<void> {
  const org = await getActiveOrg();
  if (!org) return;
  const venueName = String(formData.get("venueName") ?? "").trim();
  if (!venueName) return;
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const zip = String(formData.get("zip") ?? "").trim();
  await db.insert(industryEventLocations).values({
    orgId: org.id,
    venueName,
    address: address || null,
    city: city || null,
    state: state || null,
    zip: zip || null,
  });
  revalidatePath("/industry-events");
}

export async function deleteLocation(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "").trim();
  const org = await getActiveOrg();
  if (!id || !org) return;
  await db
    .delete(industryEventLocations)
    .where(
      and(
        eq(industryEventLocations.id, id),
        eq(industryEventLocations.orgId, org.id),
      ),
    );
  revalidatePath("/industry-events");
}
